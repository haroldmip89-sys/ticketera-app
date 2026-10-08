import { z } from "zod";

export type SeedOrganizerRef =
  | { by: "email"; email: string }
  | { by: "id"; id: string };

export type SeedOptions = {
  organizer: SeedOrganizerRef;
  dryRun: boolean;
  dateOffsetDays: number;
};

export class SeedArgsError extends Error {
  constructor(message: string) {
    super(`${message}\n\n${USAGE}`);
    this.name = "SeedArgsError";
  }
}

const USAGE = [
  "Uso:",
  "  npm run db:seed -- --organizer-email <email> [--dry-run] [--date-offset-days <n>]",
  "  npm run db:seed -- --organizer-id <uuid> [--dry-run] [--date-offset-days <n>]",
  "Alternativa: variables SEED_ORGANIZER_EMAIL / SEED_ORGANIZER_ID (el argumento gana).",
].join("\n");

const emailSchema = z.string().email();
const uuidSchema = z.string().uuid();

export function parseSeedArgs(
  argv: string[],
  env: Record<string, string | undefined>,
): SeedOptions {
  let email: string | undefined;
  let id: string | undefined;
  let dryRun = false;
  let dateOffsetDays = 0;

  const valueOf = (flag: string, index: number): string => {
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new SeedArgsError(`Falta el valor de ${flag}.`);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--organizer-email":
        email = valueOf(arg, i++);
        break;
      case "--organizer-id":
        id = valueOf(arg, i++);
        break;
      case "--dry-run":
        dryRun = true;
        break;
      case "--date-offset-days": {
        const raw = valueOf(arg, i++);
        if (!/^-?\d+$/.test(raw)) {
          throw new SeedArgsError(
            `--date-offset-days debe ser un entero (recibido "${raw}").`,
          );
        }
        dateOffsetDays = Number(raw);
        break;
      }
      default:
        throw new SeedArgsError(`Argumento desconocido: ${arg}`);
    }
  }

  if (email === undefined && id === undefined) {
    email = env.SEED_ORGANIZER_EMAIL || undefined;
    id = env.SEED_ORGANIZER_ID || undefined;
  }

  if (email !== undefined && id !== undefined) {
    throw new SeedArgsError(
      "Indica solo uno: --organizer-email o --organizer-id, no ambos.",
    );
  }
  if (email === undefined && id === undefined) {
    throw new SeedArgsError(
      "Falta el organizador: usa --organizer-email o --organizer-id.",
    );
  }

  let organizer: SeedOrganizerRef;
  if (email !== undefined) {
    if (!emailSchema.safeParse(email).success) {
      throw new SeedArgsError(`El email "${email}" no es válido.`);
    }
    organizer = { by: "email", email };
  } else {
    const value = id as string;
    if (!uuidSchema.safeParse(value).success) {
      throw new SeedArgsError(`El id "${value}" no es un uuid válido.`);
    }
    organizer = { by: "id", id: value };
  }

  return { organizer, dryRun, dateOffsetDays };
}
