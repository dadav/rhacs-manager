import { Options as FocusTrapOptions } from 'focus-trap';
import { ComponentPropsWithRef } from 'react';
export interface FocusTrapProps extends ComponentPropsWithRef<'div'> {
    active?: boolean;
    paused?: boolean;
    focusTrapOptions?: FocusTrapOptions;
    /** Prevent from scrolling to the previously focused element on deactivation */
    preventScrollOnDeactivate?: boolean;
}
export declare const FocusTrap: import("react").ForwardRefExoticComponent<Omit<FocusTrapProps, "ref"> & import("react").RefAttributes<HTMLDivElement>>;
//# sourceMappingURL=FocusTrap.d.ts.map