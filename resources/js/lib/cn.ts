import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class lists so a caller's utilities override the component's defaults. */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
