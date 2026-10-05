"use client"

import { useId, type ReactNode } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import {
  formatEventCount,
  PRICE_RANGES,
  toggleValue,
  type CategoryOption,
  type CityOption,
  type EventSearchFilters as EventSearchFiltersValue,
  type MonthOption,
  type PriceRangeValue,
} from "@/modules/events/utils/event-search"

const ANY_MONTH = "any"

const SIZE_STYLES = {
  default: {
    fieldset: "py-[18px]",
    legend: "pb-2.5 text-sm",
    row: "h-[38px] text-sm",
    control: "size-[18px]",
  },
  touch: {
    fieldset: "py-4",
    legend: "pb-2 text-[0.9375rem]",
    row: "h-11 text-[0.9375rem]",
    control: "size-5",
  },
} as const

type SizeStyles = (typeof SIZE_STYLES)[keyof typeof SIZE_STYLES]

export type EventSearchFiltersProps = {
  filters: EventSearchFiltersValue
  cityOptions: readonly CityOption[]
  monthOptions: readonly MonthOption[]
  /** Si se omite, no se renderiza el fieldset "Categoría" (panel móvil). */
  categoryOptions?: readonly CategoryOption[]
  /** "default" = aside desktop (filas de 38 px); "touch" = panel móvil (filas de 44 px). */
  size?: "default" | "touch"
  onFiltersChange: (next: EventSearchFiltersValue) => void
  className?: string
}

export function EventSearchFilters({
  filters,
  cityOptions,
  monthOptions,
  categoryOptions,
  size = "default",
  onFiltersChange,
  className,
}: EventSearchFiltersProps) {
  const styles = SIZE_STYLES[size]

  return (
    <div className={className}>
      {categoryOptions && (
        <FilterFieldset legend="Categoría" styles={styles}>
          {categoryOptions.map((option) => (
            <CheckboxRow
              key={option.id}
              label={option.label}
              count={option.count}
              checked={filters.categories.includes(option.id)}
              onCheckedChange={() =>
                onFiltersChange({
                  ...filters,
                  categories: toggleValue(filters.categories, option.id),
                })
              }
              styles={styles}
            />
          ))}
        </FilterFieldset>
      )}

      <FilterFieldset legend="Ciudad" styles={styles}>
        {cityOptions.map((option) => (
          <CheckboxRow
            key={option.city}
            label={option.city}
            count={option.count}
            checked={filters.cities.includes(option.city)}
            onCheckedChange={() =>
              onFiltersChange({ ...filters, cities: toggleValue(filters.cities, option.city) })
            }
            styles={styles}
          />
        ))}
      </FilterFieldset>

      <RadioFieldset
        legend="Fecha"
        value={filters.month ?? ANY_MONTH}
        options={[{ value: ANY_MONTH, label: "Cualquier fecha" }, ...monthOptions]}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, month: value === ANY_MONTH ? null : value })
        }
        styles={styles}
      />

      <RadioFieldset
        legend="Precio desde"
        value={filters.price}
        options={PRICE_RANGES}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, price: value as PriceRangeValue })
        }
        styles={styles}
      />
    </div>
  )
}

type FilterFieldsetProps = {
  legend: string
  legendId?: string
  styles: SizeStyles
  children: ReactNode
}

function FilterFieldset({ legend, legendId, styles, children }: FilterFieldsetProps) {
  return (
    <fieldset
      className={cn("border-b border-border last:border-b-0 last:pb-0", styles.fieldset)}
    >
      <legend id={legendId} className={cn("font-semibold", styles.legend)}>
        {legend}
      </legend>
      {children}
    </fieldset>
  )
}

const rowClassName = "cursor-pointer gap-3 font-normal leading-normal"

type CheckboxRowProps = {
  label: string
  count: number
  checked: boolean
  onCheckedChange: () => void
  styles: SizeStyles
}

function CheckboxRow({ label, count, checked, onCheckedChange, styles }: CheckboxRowProps) {
  return (
    <Label className={cn(rowClassName, styles.row)}>
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={styles.control}
      />
      <span className="flex-1">{label}</span>
      <span aria-hidden="true" className="text-[0.8125rem] text-muted-foreground tabular-nums">
        {count}
      </span>
      {" "}
      <span className="sr-only">({formatEventCount(count)})</span>
    </Label>
  )
}

type RadioFieldsetProps = {
  legend: string
  value: string
  options: readonly { value: string; label: string }[]
  onValueChange: (value: string) => void
  styles: SizeStyles
}

function RadioFieldset({ legend, value, options, onValueChange, styles }: RadioFieldsetProps) {
  const legendId = useId()

  return (
    <FilterFieldset legend={legend} legendId={legendId} styles={styles}>
      <RadioGroup
        aria-labelledby={legendId}
        value={value}
        onValueChange={(next) => onValueChange(next as string)}
        className="gap-0"
      >
        {options.map((option) => (
          <Label key={option.value} className={cn(rowClassName, styles.row)}>
            <RadioGroupItem value={option.value} className={styles.control} />
            <span className="flex-1">{option.label}</span>
          </Label>
        ))}
      </RadioGroup>
    </FilterFieldset>
  )
}
