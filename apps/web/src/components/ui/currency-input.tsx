import * as React from "react"
import { NumericFormat, NumericFormatProps } from "react-number-format"
import { cn } from "@/lib/utils"

export interface CurrencyInputProps extends Omit<NumericFormatProps, 'onValueChange'> {
    onValueChange?: (value: number | undefined) => void;
    prefix?: string;
    className?: string;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
    ({ className, onValueChange, prefix = "$", ...props }, ref) => {
        return (
            <NumericFormat
                className={cn(
                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                thousandSeparator="."
                decimalSeparator=","
                prefix={prefix}
                decimalScale={2}
                fixedDecimalScale={false}
                allowNegative={false}
                onValueChange={(values) => {
                    if (onValueChange) {
                        onValueChange(values.floatValue);
                    }
                }}
                getInputRef={ref}
                {...props}
            />
        )
    }
)
CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
