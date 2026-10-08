# 014 — Registro con verificación de email y recuperación de contraseña

- **Estado:** draft
- **Modo:** SDD
- **Actualizada tras 019–023 (2026-10-08):** alineada con la base de datos y la identidad Clerk↔DB ya implementadas. Qué cambió: (1) se declara el estado real del código (hoy `/sign-in` y `/sign-up` son los componentes prefabricados `<SignIn/>` y `<SignUp/>` de Clerk en `src/app/sign-in/[[...sign-in]]` y `src/app/sign-up/[[...sign-up]]`; no existe `src/modules/auth` ni `buildAuthHref`) y T1 retira la página prefabricada de sign-up; (2) se agrega la decisión D6 (sincronización a `users` y rol por invitación, 020/021) y sus criterios AC16–AC19; (3) `/sign-up` pasa a ser el `redirectUrl` de las invitaciones de 021, con la limitación aceptada de `__clerk_ticket`; (4) se conservan sin cambios los contratos C1–C8, los tests y los criterios AC1–AC15; (5) preguntas abiertas reducidas a la real.
- **Módulo(s):**
  - `src/modules/auth`: formulario de registro, formulario de recuperación, segmented "Ingresar | Crear cuenta", y ampliaciones de schemas y errores.
  - `src/app/(auth)`: `/sign-up` y `/reset-password`.
  - `src/lib/auth/auth-routes.ts`: helper genérico `buildAuthHref`.
- **Depende de:** **013 en `done`** (a 2026-10-08 la 013 sigue en `draft` y **no está implementada**: el código vigente usa los componentes prefabricados de Clerk) y **020 en `done`** (webhook, `usersService.ensureUserFromClerk`, guards, `user_invitations`; no se modifican aquí). Consume `AuthShell` y el layout `(auth)`, `PasswordInput`, `AUTH_INPUT_CLASS_NAME`, `GoogleSignInButton`, `VerificationCodeForm`, `SignInForm`, `SsoCallbackView`, `auth-form.schema.ts`, `auth-errors.ts`, `createFinalizeNavigate`, y las constantes y helpers de `auth-routes.ts` (`SIGN_UP_PATH` y `RESET_PASSWORD_PATH` ya existen, y el proxy ya trata ambas como rutas de auth).
- **Roadmap:** 013 Auth base e Ingresar · **014 Registro y recuperación (esta)** · 015 Roles provisionales y alta de organizador · 016 Mis entradas · 017 Panel de organizador · 018 Crear evento.

## Objetivo

1. `/sign-up` permite crear una cuenta con nombre completo, correo, contraseña y aceptación de términos. Después pide el **código de 6 dígitos** que Clerk envía al correo y, al verificarlo, deja la sesión iniciada en el destino (`redirect_url` o `/`). También ofrece "Continuar con Google".
2. `/reset-password` permite recuperar la contraseña en 3 pasos (correo → código → nueva contraseña) y deja la sesión iniciada.
3. Todo usuario que se registra aquí (correo o Google) queda con su fila en `users` sin código nuevo en este módulo: la sincroniza el webhook de 020 y, si el webhook aún no llegó, el upsert on-demand del primer request protegido (020 D3). Si su email verificado coincide con una invitación pendiente de 021, recibe el rol al verificarse (020 D6). Esta spec solo debe **no romper** ese flujo (D6).
4. `/sign-in` y `/sign-up` muestran el segmented "Ingresar | Crear cuenta" del diseño y los links "¿Olvidaste tu contraseña?", "¿No tienes cuenta? Crea una gratis" y "¿Ya tienes cuenta? Inicia sesión". Todos conservan el `redirect_url`.

## Fuera de alcance

- Roles, organizador y guards de servidor: ya los resuelve 020 desde la DB; la 015 queda reemplazada en esa parte (020, "Relación con 013–015").
- Escribir en la DB, llamar a `usersService` o importar `@/db` desde este módulo: la identidad se sincroniza por webhook/guards (020). Los formularios solo hablan con Clerk.
- Procesar `__clerk_ticket` de las invitaciones (021) en el formulario propio: aceptado (020 Q7). No se prellena el correo; el rol se aplica por email verificado coincidente (D6).
- Botón "Registrarse" del header y menú de usuario: pertenecen a 013 (`HeaderSessionActions`); aquí solo se garantiza que `/sign-up` exista.
- Páginas legales: "Términos y condiciones" se muestra como texto, sin link (D3).
- Medidor de fortaleza de contraseña, confirmación de contraseña ("repite la contraseña"), registro con teléfono o username, email links, cambio de email o contraseña desde una página de perfil.
- Temporizador de reenvío de código: el botón solo se deshabilita mientras reenvía.
- Envío de correos propios (Resend): los correos de código los envía Clerk con su plantilla.

## Precondiciones

- 013 en `done`.
- 020 en `done`. Para comprobar D6 hace falta, además: migración `0001` en Neon `dev` (020 M3), webhook de Clerk apuntando a `/api/webhooks/clerk` con `CLERK_WEBHOOK_SIGNING_SECRET` (020 M1) y `SUPER_ADMIN_EMAIL`/`NEXT_PUBLIC_APP_URL` en `.env` (020 M2). Sin ellos el registro funciona igual; solo no se verá la fila por webhook (el upsert on-demand sí).
- M2 de la 013 aplicado: email con **verification code** activado, contraseña activada, nombre y apellido activados y opcionales, teléfono y username desactivados, consentimiento legal desactivado.
- Sin dependencias npm nuevas.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| Páginas actuales `/sign-in` y `/sign-up` (prefabricadas `<SignIn/>`, `<SignUp/>`) | reemplazar | `src/app/sign-in/[[...sign-in]]/page.tsx` (la retira la 013), `src/app/sign-up/[[...sign-up]]/page.tsx` (la retira T1) | Dos rutas para `/sign-up` (catch-all + `(auth)/sign-up/page.tsx`) rompen el build: la catch-all se **elimina**. La prefabricada ya cubre registro, Google y reset con la UI de Clerk; esta fase la sustituye por el diseño propio (ver Preguntas abiertas). |
| `usersService.ensureUserFromClerk`, `processClerkWebhook`, `/api/webhooks/clerk`, mapper de Clerk, `user_invitations` | reutilizar (sin cambios) | `src/modules/users/**`, `src/app/api/webhooks/clerk/route.ts` (020) | Ya existen. Este módulo no los importa. `/api/webhooks/clerk` sigue público (no está en `isProtectedPath`). |
| `ADMIN_PATH`, `isProtectedPath` | reutilizar | `src/lib/auth/auth-routes.ts` | Ya existen. `buildSignInHref` lo crea la 013 y `buildAuthHref` esta spec (C1); hoy no existen. |
| `useSignUp` | reutilizar (Clerk) | `@clerk/nextjs` | API signal (013 D1): `signUp.password(…)`, `signUp.verifications.sendEmailCode()`, `signUp.verifications.verifyEmailCode({ code })`, `signUp.finalize({ navigate })`, `signUp.reset()`, y `signUp.status: "missing_requirements" \| "complete" \| "abandoned"`. Verificado en `@clerk/shared` 4.39.0 (`SignUpFutureResource`). |
| `useSignIn` (reset) | reutilizar (Clerk) | `@clerk/nextjs` | `signIn.create({ identifier })`, `signIn.resetPasswordEmailCode.sendCode()`, `.verifyCode({ code })`, `.submitPassword({ password, signOutOfOtherSessions })` y `signIn.finalize`. |
| `AuthShell`, `(auth)/layout.tsx` | reutilizar | 013 | Las páginas nuevas heredan el layout partido. |
| `PasswordInput`, `AUTH_INPUT_CLASS_NAME` | reutilizar | 013 | Con `autoComplete="new-password"`. |
| `GoogleSignInButton` | reutilizar (sin cambios) | 013 | Usa `signIn.sso`. Si el usuario no existe, Clerk lo transfiere a registro en el callback (013 D9). No hace falta un botón con `signUp.sso`. |
| `VerificationCodeForm` | reutilizar (sin cambios) | 013 | Verificación de email al registrarse y paso de código del reset. |
| `SignInForm` | extender | `src/modules/auth/components/sign-in-form.tsx` | Segmented, "¿Olvidaste tu contraseña?", "¿No tienes cuenta?" y mensajes que mencionan el reset. |
| `SsoCallbackView` | extender (2 props) | `src/modules/auth/components/sso-callback-view.tsx` | `signUpUrl` y `continueSignUpUrl` pasan de `SIGN_IN_PATH` a `SIGN_UP_PATH`. |
| `auth-form.schema.ts` | extender | `src/modules/auth/schemas/` | Registro, `splitFullName` y contraseña nueva. |
| `auth-errors.ts` | extender | `src/modules/auth/utils/` | Flujos `"sign-up"` y `"reset-password"`, más códigos nuevos. |
| `buildSignInHref` | extender (generalizar) | `src/lib/auth/auth-routes.ts` | Se agrega `buildAuthHref(path, returnTo)`. `buildSignInHref` pasa a delegar en él, con salida idéntica (sus tests de la 013 no cambian). |
| `Checkbox` | reutilizar | `src/components/ui/checkbox.tsx` | Términos. Base UI: los props `aria-*` llegan al `span role="checkbox"` (verificado en la 012). |
| `FieldDescription` | reutilizar | `src/components/ui/field.tsx` | "Al menos 8 caracteres.". |
| Segmented "Ingresar \| Crear cuenta" | crear | `src/modules/auth/components/auth-mode-tabs.tsx` | No existe un segmented de navegación. `ToggleChip` es un botón con `aria-pressed`, no un link. shadcn `tabs` no aplica porque son rutas distintas (D2). |
| `SignUpForm`, `ResetPasswordForm` | crear | `src/modules/auth/components/` | |

## Decisiones

### D1 — Nombre completo → `firstName` / `lastName`

- El diseño pide un solo campo "Nombre completo" y Clerk guarda `firstName`/`lastName`.
- `splitFullName`:
  1. recorta los espacios de los bordes y colapsa los internos;
  2. el **primer** término es `firstName`;
  3. el **resto** es `lastName` (`null` si no hay).
  Ej.: "Ana María López" → "Ana" / "María López". Es imperfecto para nombres compuestos, pero sin pérdida: `fullName` en Clerk vuelve a ser "Ana María López".
- Si `lastName` es `null`, no se envía. Por eso el apellido debe ser **opcional** en el Dashboard (M2 de la 013).

### D2 — Segmented como navegación con links (no tabs)

- "Ingresar" y "Crear cuenta" son **rutas** distintas (`/sign-in`, `/sign-up`), con su URL, historial y `redirect_url`.
- Se implementan como `<nav aria-label="Acceso">` con dos `Link`. El actual lleva `aria-current="page"`.
- El diseño usa `<button aria-pressed>` porque alterna estado en la misma página, y eso no aplica aquí.
- **Texto:** "Ingresar" | "Crear cuenta".
  - El lienzo `Auth.dc.html` rotula la primera pestaña "Iniciar sesión", y `reference-design.md` §2.8 "Ingresar".
  - Se usa "Ingresar", para que no haya dos controles llamados "Iniciar sesión" (la pestaña y el submit), lo que confunde al lector de pantalla y a los tests.

### D3 — Términos y condiciones sin link

- El checkbox es obligatorio (zod). El texto es "Acepto los términos y condiciones", sin link: no existen páginas legales y un `href="#"` sería un link muerto.
- Cuando existan, se convierte en link (fase futura, sin número).
- La aceptación es de UI: no se envía `legalAccepted` a Clerk, porque el consentimiento legal está desactivado en el Dashboard (M2). Esto se declara como **TEMPORAL**.
- Bajo "Continuar con Google" en `/sign-up` se muestra: "Al continuar con Google aceptas los términos y condiciones." (13px, `text-muted-foreground`). Google no pasa por el checkbox.

### D4 — Recuperación: errores explícitos

- Si el correo no existe, `signIn.create({ identifier })` devuelve `form_identifier_not_found`. En el flujo de reset se muestra "No encontramos una cuenta con ese correo." en el campo.
- Es lo mismo que hace la UI prearmada de Clerk. Ocultarlo dejaría al usuario esperando un código que nunca llega.
- En el ingreso (013) el mensaje sigue siendo genérico.

### D5 — Una sola contraseña nueva, sin confirmación

- El registro del diseño tiene un solo campo de contraseña con "mostrar/ocultar".
- El reset sigue el mismo criterio (KISS): un campo "Nueva contraseña" con `PasswordInput`.
- Reglas de cliente (registro y reset): no vacía y de **al menos 8 caracteres** (el mínimo por defecto de Clerk). El resto (filtraciones, complejidad, largo máximo) lo valida Clerk, y se traduce con `auth-errors`.

### D6 — Sincronización con la base e invitaciones (020/021)

- El formulario de registro **no** escribe en la DB. Tras `finalize`, Clerk emite `user.created` y 020 crea la fila en `users` (`full_name` = `firstName lastName` enviado según D1, `auth_providers` con `password` o `google`). Si el usuario llega a una ruta protegida antes del webhook, el guard hace el upsert on-demand con `currentUser()`; ambos caminos son idempotentes y no requieren coordinación.
- La verificación del correo con código (C5) es lo que deja `emailVerified = true` en el snapshot. Sin verificar, 020 no aplica bootstrap ni invitaciones. Por eso el registro **debe** exigir el código (ya lo exige) y no se agrega ningún camino que cree sesión con email sin verificar.
- Invitación de 021: llega un correo de Clerk con enlace a `<NEXT_PUBLIC_APP_URL>/sign-up` (con `__clerk_ticket`). Este formulario lo ignora (020 Q7): la persona escribe su correo, lo verifica y, si coincide (sin distinguir mayúsculas) con una invitación `pending`, 020 aplica el rol (`admin` u organizador) y la marca `accepted`. Con otro correo no recibe el rol (comportamiento ya documentado en 021).
- "Continuar con Google" desde `/sign-up` sigue el mismo camino: el correo de Google llega verificado y el rol se aplica por coincidencia.
- Recuperar contraseña no toca la DB. Si Clerk emite `user.updated` (p. ej. al activarse `password_enabled` en un usuario que solo usaba Google), 020 actualiza `auth_providers` por upsert; no hay trabajo aquí.
- Un usuario **desactivado** en 021 está baneado en Clerk y no podrá crear sesión. Sus errores caen en el mensaje genérico de `auth-errors` (013); no se agrega copy específico (YAGNI).

## Contratos

### C1 — `src/lib/auth/auth-routes.ts` (agregado)

```ts
export type AuthPagePath = typeof SIGN_IN_PATH | typeof SIGN_UP_PATH | typeof RESET_PASSWORD_PATH
/** path si returnTo no es seguro o es "/"; si no, path + "?redirect_url=" + encodeURIComponent(ruta segura). */
export function buildAuthHref(path: AuthPagePath, returnTo?: string | null): string
// buildSignInHref(returnTo) === buildAuthHref(SIGN_IN_PATH, returnTo)  (misma salida que en la 013)
```

### C2 — `auth-form.schema.ts` (agregado)

```ts
export const MIN_PASSWORD_LENGTH = 8
export type SignUpFormValues = { fullName: string; email: string; password: string; acceptTerms: boolean }
export type SignUpFieldName = keyof SignUpFormValues
export type SignUpFormData = { firstName: string; lastName: string | null; email: string; password: string }
export const EMPTY_SIGN_UP_FORM: SignUpFormValues
export const SIGN_UP_FIELD_ORDER: readonly SignUpFieldName[] = ["fullName", "email", "password", "acceptTerms"]
export const signUpFormSchema: z.ZodType<SignUpFormData, SignUpFormValues>
export function getSignUpFieldErrors(values: SignUpFormValues): Partial<Record<SignUpFieldName, string>>
export function splitFullName(fullName: string): { firstName: string; lastName: string | null }

/** Mismas reglas de email que el ingreso. Mensaje o null. */
export function getEmailError(value: string): string | null
/** Reglas de contraseña nueva (D5). Mensaje o null. */
export function getNewPasswordError(value: string): string | null
```

| Campo | Caso | Mensaje |
|---|---|---|
| fullName | menos de 2 caracteres tras normalizar | "Ingresa tu nombre completo." |
| fullName | más de 100 | "El nombre puede tener hasta 100 caracteres." |
| email | (igual que la 013) | "Ingresa tu correo electrónico." / "Ingresa un correo válido, por ejemplo tu@email.com." |
| password (registro y reset) | vacía | "Ingresa una contraseña." |
| password (registro y reset) | menos de 8 caracteres | "La contraseña debe tener al menos 8 caracteres." |
| acceptTerms | `false` | "Acepta los términos y condiciones para continuar." |

`signInFormSchema` refactoriza su email para usar la misma regla que `getEmailError` (DRY dentro del módulo). Sus mensajes no cambian.

### C3 — `auth-errors.ts` (agregado)

```ts
export type AuthErrorFlow = "sign-in" | "google" | "sign-up" | "reset-password"
```

Filas nuevas o con cambios, que se evalúan antes que las de la 013 cuando la condición incluye el flujo:

| Condición | field | message |
|---|---|---|
| `form_identifier_exists` (cualquier flujo) | email | "Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña." |
| `form_identifier_not_found` con flow `"reset-password"` | email | "No encontramos una cuenta con ese correo." |
| `form_password_pwned` con flow `"sign-up"` o `"reset-password"` | password | "Esta contraseña apareció en una filtración de datos. Elige otra." |
| `form_password_pwned`, `form_password_pwned__sign_in` con flow `"sign-in"` | form | "Por seguridad, esta contraseña ya no se puede usar porque apareció en una filtración de datos. Restablécela con «¿Olvidaste tu contraseña?»." (cambia el texto de la 013) |
| `form_password_length_too_short` | password | "La contraseña debe tener al menos 8 caracteres." |
| `form_password_not_strong_enough`, `form_password_validation_failed` | password | "Elige una contraseña más segura: combina letras, números y símbolos." |
| `form_password_size_in_bytes_exceeded` | password | "La contraseña es demasiado larga." |
| `form_email_address_blocked` | email | "No aceptamos correos temporales. Usa tu correo habitual." |
| `form_param_nil` | form | "Completa todos los campos obligatorios." |

El resto de la tabla de la 013 no cambia y aplica a todos los flujos.

### C4 — `AuthModeTabs` (`src/modules/auth/components/auth-mode-tabs.tsx`)

```ts
export type AuthMode = "sign-in" | "sign-up"
export type AuthModeTabsProps = { current: AuthMode; redirectPath: string }
export function AuthModeTabs(props: AuthModeTabsProps): React.JSX.Element
```

Transcrito del diseño:

- **Contenedor:** `nav` en `grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1`.
- **Cada link:**
  - `h-11 rounded-xl text-[0.9375rem] inline-flex items-center justify-center focus-ring`;
  - actual: `bg-card font-semibold shadow-[0_2px_8px_-4px_rgb(24_24_27/0.3)]` + `aria-current="page"`;
  - otro: `font-medium hover:bg-card/60`.
- **hrefs:**
  - "Ingresar" → `buildAuthHref(SIGN_IN_PATH, redirectPath)`;
  - "Crear cuenta" → `buildAuthHref(SIGN_UP_PATH, redirectPath)`.

### C5 — `SignUpForm` (`src/modules/auth/components/sign-up-form.tsx`, `"use client"`)

```ts
export type SignUpFormProps = { redirectPath: string }
export function SignUpForm(props: SignUpFormProps): React.JSX.Element
```

Paso **datos**. Textos transcritos de `Auth`/`AuthMobile` ("Crear cuenta"), salvo los marcados:

1. `AuthModeTabs current="sign-up"`. Separación con el contenido: `gap-7` (28) en desktop y `gap-6` (24) en móvil.
2. `<h1>` "Crea tu cuenta" + `<p>` "Guarda tus entradas y recibe novedades de tus eventos." Mismos estilos que el ingreso.
3. `GoogleSignInButton redirectPath={redirectPath}` + la nota legal de D3 (criterio propio).
4. `FieldSeparator` "o regístrate con tu correo" (criterio propio).
5. `<form noValidate>` (`gap-4.5`, móvil `gap-4`):
   - "Nombre completo": `autoComplete="name"`, placeholder "Tu nombre y apellido", id `sign-up-full-name`.
   - "Correo electrónico": `type="email"`, `autoComplete="email"`, placeholder "tu@email.com", id `sign-up-email`.
   - "Contraseña": `PasswordInput autoComplete="new-password"`, id `sign-up-password`, con `FieldDescription` "Al menos 8 caracteres." (criterio propio; id `sign-up-password-hint` en `aria-describedby`, junto al id del error si lo hay).
   - **Términos:**
     - `Checkbox` id `sign-up-terms` (`size-5`, móvil `size-5.5`) + `<label htmlFor>` "Acepto los términos y condiciones" (14px, `text-foreground/80`, `gap-3`);
     - con error: `aria-invalid` y `aria-describedby` en el checkbox, y `FieldError`.
   - `<div id="clerk-captcha" />` (bot protection de Clerk en flujos propios), antes del botón.
   - Error de formulario (`role="alert"`) y submit "Crear cuenta". Mismo estilo y estado de carga que "Iniciar sesión".
   - `<p>` 14px `text-muted-foreground text-center`: "¿Ya tienes cuenta? " + link "Inicia sesión" (`text-primary font-semibold`, `min-h-8`) → `buildAuthHref(SIGN_IN_PATH, redirectPath)`.
6. **Al enviar:**
   1. zod (`getSignUpFieldErrors`, foco al primer inválido, sin llamar a Clerk si hay errores);
   2. `signUp.password({ emailAddress, password, firstName, ...(lastName ? { lastName } : {}) })`;
   3. si hay error → `getAuthErrorMessage(error, "sign-up")`, mostrado en el campo indicado (con foco) o como error de formulario;
   4. si no → `signUp.verifications.sendEmailCode()`;
   5. si sale bien → paso **verificación** con el foco en el código.

Paso **verificación** (`VerificationCodeForm`):

- `title` "Verifica tu correo";
- `description` "Te enviamos un código de 6 dígitos a **{email}**. Ingrésalo para activar tu cuenta.";
- `submitLabel` "Verificar y crear cuenta";
- `backLabel` "Cambiar correo";
- **`onVerify`:** `signUp.verifications.verifyEmailCode({ code })`.
  - con error → `getAuthErrorMessage(error, "sign-up")`;
  - con `status === "complete"` → `signUp.finalize({ navigate: createFinalizeNavigate(…, redirectPath) })`;
  - si no → error de formulario "No pudimos completar tu registro. Inténtalo de nuevo.".
- **`onResend`:** `signUp.verifications.sendEmailCode()`.
- **`onBack`:** `signUp.reset()` y vuelve a datos con nombre, correo y términos conservados y la contraseña vacía.
- El segmented no se muestra en este paso.

### C6 — `ResetPasswordForm` (`src/modules/auth/components/reset-password-form.tsx`, `"use client"`)

```ts
export type ResetPasswordFormProps = { redirectPath: string }
export function ResetPasswordForm(props: ResetPasswordFormProps): React.JSX.Element
```

Textos de criterio propio (el diseño no trae esta pantalla). Estilos iguales al ingreso.

1. **Correo:**
   - `<h1>` "Recupera tu contraseña" + "Te enviaremos un código para que crees una contraseña nueva.";
   - campo "Correo electrónico" (id `reset-email`, `autoComplete="email"`);
   - submit "Enviar código";
   - link "Volver a iniciar sesión" → `buildAuthHref(SIGN_IN_PATH, redirectPath)`.
   - Al enviar:
     1. `getEmailError`;
     2. `signIn.create({ identifier: email })`, mapeando errores con `"reset-password"`;
     3. `signIn.resetPasswordEmailCode.sendCode()`;
     4. paso **código**.
2. **Código** (`VerificationCodeForm`):
   - `title` "Revisa tu correo", `description` "Te enviamos un código de 6 dígitos a **{email}**.", `submitLabel` "Continuar", `backLabel` "Cambiar correo";
   - `onVerify`: `signIn.resetPasswordEmailCode.verifyCode({ code })`. Sin error → paso **nueva contraseña** con foco en el campo;
   - `onResend`: `sendCode()`;
   - `onBack`: `signIn.reset()` y vuelve a correo.
3. **Nueva contraseña:**
   - `<h1>` "Crea una contraseña nueva";
   - `PasswordInput` "Nueva contraseña" (id `reset-new-password`, `autoComplete="new-password"`, descripción "Al menos 8 caracteres.");
   - submit "Guardar y entrar".
   - Al enviar:
     1. `getNewPasswordError`;
     2. `signIn.resetPasswordEmailCode.submitPassword({ password, signOutOfOtherSessions: true })`, mapeando errores con `"reset-password"`.
     3. Según el `status`:
        - `"complete"` → `signIn.finalize({ navigate: createFinalizeNavigate(…, redirectPath) })`;
        - cualquier otro → error de formulario "Tu contraseña se actualizó. Inicia sesión con la nueva contraseña." más el link "Ir a iniciar sesión".

### C7 — `SignInForm` (cambios sobre la 013, C13)

1. `AuthModeTabs current="sign-in"` arriba, solo en el paso credenciales (separación `gap-7` / `gap-6`).
2. **"¿Olvidaste tu contraseña?"** → `buildAuthHref(RESET_PASSWORD_PATH, redirectPath)`, `text-sm font-semibold text-primary`, `focus-ring`:
   - desktop (`hidden lg:inline-flex`): en la fila del label "Contraseña", alineado a la derecha (`flex justify-between`);
   - móvil (`lg:hidden`): bajo el input, con `min-h-8`.
   Transcrito del diseño. Solo uno de los dos es visible y está en el árbol de accesibilidad a la vez.
3. Bajo el submit: `<p>` "¿No tienes cuenta? " + link "Crea una gratis" → `buildAuthHref(SIGN_UP_PATH, redirectPath)`.
4. `needs_new_password` → "Debes cambiar tu contraseña antes de ingresar. Usa «¿Olvidaste tu contraseña?»." (cambia el texto de la 013).

### C8 — Páginas

- **`src/app/(auth)/sign-up/page.tsx`:**
  - `metadata: { title: "Crear cuenta — Ticketera" }`;
  - `<SignUpForm redirectPath={resolveAfterAuthPath(redirect_url)} />`.
- **`src/app/(auth)/reset-password/page.tsx`:**
  - `metadata: { title: "Recuperar contraseña — Ticketera", robots: { index: false } }`;
  - `<ResetPasswordForm redirectPath={resolveAfterAuthPath(redirect_url)} />`.
- Con sesión, ambas redirigen por el proxy (013 C2). No hace falta cambiar el proxy.

## Tareas

### Preparación (serie)

- **P1** Contratos compartidos. Archivos:
  - `src/lib/auth/auth-routes.ts` (C1)
  - `src/lib/auth/auth-routes.test.ts`
  - `src/modules/auth/schemas/auth-form.schema.ts` (C2)
  - `src/modules/auth/schemas/auth-form.schema.test.ts`
  - `src/modules/auth/utils/auth-errors.ts` (C3)
  - `src/modules/auth/utils/auth-errors.test.ts`
  - `src/modules/auth/components/auth-mode-tabs.tsx` (C4)

  Al terminar: `npm run lint` y `npm run test`.

### Paralelo (tras P1; archivos disjuntos; nadie corre `npm install` ni `npm run build`)

- **T1** Registro. Archivos:
  - `src/modules/auth/components/sign-up-form.tsx` (C5)
  - `src/modules/auth/components/sign-up-form.test.tsx`
  - `src/app/(auth)/sign-up/page.tsx` (C8)
  - `src/modules/auth/components/sso-callback-view.tsx`: `signUpUrl={SIGN_UP_PATH}` y `continueSignUpUrl={SIGN_UP_PATH}`.
  - `src/app/sign-up/[[...sign-up]]/page.tsx`: **eliminar** (página prefabricada; la reemplaza `(auth)/sign-up/page.tsx`). Comprobar que no queda otra ruta `/sign-up`.
- **T2** Recuperación y links del ingreso. Archivos:
  - `src/modules/auth/components/reset-password-form.tsx` (C6)
  - `src/modules/auth/components/reset-password-form.test.tsx`
  - `src/app/(auth)/reset-password/page.tsx` (C8)
  - `src/modules/auth/components/sign-in-form.tsx` (C7)
  - `src/modules/auth/components/sign-in-form.test.tsx`

Verificación acotada: `npx vitest run <tests de la tarea>` y `npx eslint <archivos de la tarea>`. El reviewer corre el build completo.

**Tamaño:** 16 archivos creados o modificados (8 de código, 6 de test y 2 páginas) más 1 eliminado. Es el límite de una sesión; si no cabe, T2 (recuperación y links del ingreso) pasa a una spec posterior.

## Criterios de aceptación

**A. Segmented y links**

- [ ] AC1 En `/sign-in` y `/sign-up` se ve el segmented "Ingresar | Crear cuenta" (contenedor `bg-muted` y opción actual blanca con sombra) como `nav` con dos links. El actual tiene `aria-current="page"`. Ambos conservan el `redirect_url`: en `/sign-in?redirect_url=%2Fevents`, "Crear cuenta" apunta a `/sign-up?redirect_url=%2Fevents`.
- [ ] AC2 En `/sign-in`:
  - "¿Olvidaste tu contraseña?" está junto al label en desktop y bajo el input en móvil (solo uno visible), y apunta a `/reset-password` con el mismo `redirect_url`;
  - "¿No tienes cuenta? Crea una gratis" apunta a `/sign-up`.
- [ ] AC3 Ningún link de las pantallas de auth apunta a `#` ni da 404.

**B. Registro (`/sign-up`)**

- [ ] AC4 Se ven, en orden:
  - segmented;
  - "Crea tu cuenta" (único `<h1>`) y "Guarda tus entradas y recibe novedades de tus eventos.";
  - "Continuar con Google" y la nota "Al continuar con Google aceptas los términos y condiciones.";
  - el separador "o regístrate con tu correo";
  - "Nombre completo" (`autocomplete="name"`), "Correo electrónico" y "Contraseña" (`autocomplete="new-password"`, con "Al menos 8 caracteres.");
  - el checkbox "Acepto los términos y condiciones", sin link;
  - el botón "Crear cuenta";
  - "¿Ya tienes cuenta? Inicia sesión".

  Mismo layout desktop y móvil que la 013.
- [ ] AC5 "Crear cuenta" vacío:
  - muestra "Ingresa tu nombre completo.", "Ingresa tu correo electrónico.", "Ingresa una contraseña." y "Acepta los términos y condiciones para continuar.";
  - enfoca "Nombre completo";
  - no llama a Clerk.

  Una contraseña de 7 caracteres muestra "La contraseña debe tener al menos 8 caracteres.".
- [ ] AC6 Con datos válidos llega un correo con un código y se ve "Verifica tu correo" con el email, con el foco en el código.
  - El código correcto crea la cuenta y deja la sesión iniciada en `redirect_url` o `/`. El header muestra "Mi cuenta" y el menú muestra el nombre completo ingresado.
  - En el Dashboard, el usuario tiene `firstName` = el primer término y `lastName` = el resto.
- [ ] AC7 Un correo ya registrado muestra en el campo "Ya existe una cuenta con este correo. Inicia sesión o recupera tu contraseña.". Una contraseña filtrada (p. ej. `password123`) muestra "Esta contraseña apareció en una filtración de datos. Elige otra.".
- [ ] AC8 En la verificación:
  - un código incorrecto muestra "El código no es correcto. Revísalo e inténtalo de nuevo.";
  - "Reenviar código" muestra "Te enviamos un código nuevo.";
  - "Cambiar correo" vuelve al formulario con nombre, correo y términos conservados y la contraseña vacía.
- [ ] AC9 "Continuar con Google" desde `/sign-up` con una cuenta de Google nueva crea la cuenta y vuelve con sesión al destino.

**C. Recuperación (`/reset-password`)**

- [ ] AC10 Correo inexistente → "No encontramos una cuenta con ese correo.". Con un correo existente llega un código.
  - el código correcto lleva a "Crea una contraseña nueva";
  - una contraseña de 8 o más caracteres guarda y deja la sesión iniciada en `redirect_url` o `/`;
  - la contraseña anterior ya no sirve y la nueva sí.
- [ ] AC11 "Volver a iniciar sesión" lleva a `/sign-in`, conservando el `redirect_url`.

**D. Integración**

- [ ] AC12 Con sesión, `/sign-up` y `/reset-password` redirigen a `/` (o a un `redirect_url` válido), como `/sign-in`.
- [ ] AC13 `SsoCallbackView` usa `SIGN_UP_PATH` en `signUpUrl` y `continueSignUpUrl`.
- [ ] AC14 Todos los estados de carga (submit, reenviar) tienen `aria-busy`, `aria-disabled` y foco conservado, y no permiten doble envío. Todos los errores se anuncian (`role="alert"`) y los campos inválidos tienen `aria-invalid` y `aria-describedby`.
- [ ] AC15 El ingreso de la 013 sigue funcionando (AC10–AC19 de la 013). Los tests de la 013 siguen en verde, salvo los que esta spec amplía.

**E. Sincronización con la base (020/021)**

- [ ] AC16 Un registro nuevo con correo y código termina con una fila en `users` (`email`, `full_name` = nombre ingresado, `auth_providers` con `password`) sin `deleted_at` ni `deactivated_at`, con el webhook activo o sin él (al entrar a una ruta protegida, upsert on-demand). Con "Continuar con Google" la fila tiene `auth_providers` con `google`.
- [ ] AC17 Con una invitación `pending` creada desde `/admin/users` para `x@dominio.com`, registrarse en `/sign-up` con ese correo (cualquier combinación de mayúsculas) y verificar el código deja aplicado el `staff_role` (o el perfil de organizador) y la invitación `accepted`. Con otro correo no se aplica el rol.
- [ ] AC18 Ni `src/modules/auth/**` ni las páginas de auth importan `@/db`, `@/modules/users` ni `@/lib/auth/guards` (`git grep` → 0). `/api/webhooks/clerk` sigue sin exigir sesión.
- [ ] AC19 Tras completar un registro con `redirect_url=/admin/users` (usuario no staff), la app responde 404 de `requireStaff`, sin error 500 ni bucle hacia `/sign-in`: la fila ya existe o se crea on-demand.

## Tests obligatorios

- **`src/lib/auth/auth-routes.test.ts`** (ampliar): `buildAuthHref` con cada `AuthPagePath`, con `returnTo` seguro, inseguro y `"/"`. `buildSignInHref` devuelve lo mismo que `buildAuthHref(SIGN_IN_PATH, …)`. Los tests de la 013 siguen sin cambios.
- **`src/modules/auth/schemas/auth-form.schema.test.ts`** (ampliar):
  - `splitFullName`:
    - `"Ana"` → `{ "Ana", null }`;
    - `"  Ana   María  López "` → `{ "Ana", "María López" }`.
  - `getSignUpFieldErrors`:
    - válido;
    - vacío → 4 mensajes;
    - nombre de 1 carácter;
    - nombre de 101 caracteres;
    - email inválido;
    - contraseña de 7 caracteres;
    - términos `false`.
  - `signUpFormSchema` produce `firstName`/`lastName`/email recortado y la contraseña sin tocar.
  - `getEmailError` y `getNewPasswordError` (vacío, corto, válido).
  - Los tests de ingreso y código de la 013 siguen en verde.
- **`src/modules/auth/utils/auth-errors.test.ts`** (ampliar): una fila por cada condición de C3, con `flow`, `field` y `message` exactos (incluido `form_identifier_not_found` en sign-in → genérico, y en reset → específico).
- **`src/modules/auth/components/sign-up-form.test.tsx`** (`vi.mock("@clerk/nextjs")` con `useSignUp` y `useSignIn` fakes; `vi.mock("next/navigation")`):
  1. vacío → 4 errores, foco en el nombre, y `password` no fue llamado;
  2. válido → `signUp.password` recibió `{ emailAddress, password, firstName: "Ana", lastName: "María López" }` (con nombre de un término, sin `lastName`) y `verifications.sendEmailCode` fue llamado;
  3. aparece "Verifica tu correo" con el email y foco en el código;
  4. `verifyEmailCode` con éxito y `status` `"complete"` → `finalize`, y su `navigate` hace `push(redirectPath)`;
  5. `form_identifier_exists` → error en el campo email, con foco;
  6. `verifyEmailCode` con `form_code_incorrect` → error del código;
  7. `status` `"missing_requirements"` tras verificar → "No pudimos completar tu registro. Inténtalo de nuevo.";
  8. "Cambiar correo" → `reset` y los valores conservados (la contraseña vacía);
  9. hay un elemento `#clerk-captcha` en el paso datos;
  10. el link "Inicia sesión" y las pestañas llevan el `redirect_url`;
  11. el componente no depende de la DB: el test no necesita mockear `@/db` ni `@/modules/users` (AC18).
- **`src/modules/auth/components/reset-password-form.test.tsx`**:
  1. email inválido → error sin llamar a Clerk;
  2. `create` con `form_identifier_not_found` → "No encontramos una cuenta con ese correo.";
  3. éxito → `create({ identifier })` y luego `resetPasswordEmailCode.sendCode`;
  4. código → `verifyCode({ code })` y paso nueva contraseña con foco;
  5. contraseña corta → error sin llamar a Clerk;
  6. `submitPassword({ password, signOutOfOtherSessions: true })` con `status` `"complete"` → `finalize` → `push(redirectPath)`;
  7. otro `status` → mensaje con el link "Ir a iniciar sesión".
- **`src/modules/auth/components/sign-in-form.test.tsx`** (ampliar):
  - tabs con `aria-current` en "Ingresar";
  - "¿Olvidaste tu contraseña?" → `/reset-password?redirect_url=…`;
  - "Crea una gratis" → `/sign-up?redirect_url=…`;
  - tabs ocultos en el paso de código;
  - nuevo texto de `needs_new_password`;
  - los casos de la 013 siguen en verde.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- `git grep -nE "@/db|@/modules/users|auth/guards" -- src/modules/auth "src/app/(auth)"` → sin resultados (AC18).
- **Manual** (`npm run dev`), desktop y móvil, claro y oscuro:
  - Registrarse con un correo real (o, en la instancia Development, con un correo de prueba `nombre+clerk_test@example.com`, que acepta el código fijo `424242` sin enviar correo), verificar y comprobar el usuario en el Dashboard (AC4–AC8).
  - Registro con Google (AC9).
  - Recuperar la contraseña del usuario de M3 de la 013 (AC10–AC11).
  - Con 020 aplicado: tras registrarse, `npm run db:studio` muestra la fila en `users` y el `webhook_events` procesado (AC16); con una invitación pendiente de 021 para el correo de prueba, el rol queda aplicado (AC17). Sin túnel para el webhook, comprobar que la fila aparece al abrir una página protegida (on-demand).
  - Navegar entre pestañas con un `redirect_url` de checkout y completar el registro: se vuelve al checkout con la query intacta (AC1, AC6).

## Preguntas abiertas

1. **Real, a decidir al aprobar:** hoy el registro y el reset funcionan con la UI prefabricada de Clerk (`<SignUp/>` y reset dentro de `<SignIn/>`), ya conectada al webhook y a las invitaciones de 020/021 (con `__clerk_ticket` incluido). Esta spec la sustituye por formularios propios con el diseño de `Auth.dc.html`, lo que **añade** la limitación de `__clerk_ticket` (aceptada en 020 Q7) y depende de que la 013 (formularios propios, aún sin implementar) se ejecute primero. Recomendado: mantener el plan (consistencia visual con 013). Alternativa: posponer 013/014 y conservar las prefabricadas con `appearance` de shadcn; en ese caso esta spec se archiva y solo faltaría enlazar el header a `/sign-up`.

Criterio propio revisable al aprobar (sin bloquear): términos como texto sin link (D3), pestaña "Ingresar" en vez de "Iniciar sesión" (D2) y reset sin campo de confirmación (D5).
