import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CheckedState = boolean | 'indeterminate';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'checked' | 'onChange'> {
    checked?: CheckedState;
    onCheckedChange?: (checked: CheckedState) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, checked, onCheckedChange, disabled, ...props }, ref) => {
        const isChecked = checked === true;

        return (
            <div className="relative inline-flex items-center justify-center">
                <input
                    type="checkbox"
                    ref={ref}
                    className="sr-only"
                    checked={isChecked}
                    disabled={disabled}
                    onChange={(e) => onCheckedChange?.(e.target.checked)}
                    {...props}
                />
                <div
                    className={cn(
                        'h-4 w-4 shrink-0 rounded-sm border border-slate-300 shadow-sm transition-colors cursor-pointer',
                        'focus-within:ring-1 focus-within:ring-emerald-500 focus-within:ring-offset-1',
                        isChecked
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-white hover:border-slate-400',
                        disabled && 'opacity-50 cursor-not-allowed',
                        className
                    )}
                >
                    {isChecked && (
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    )}
                </div>
            </div>
        );
    }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
