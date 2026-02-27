/// <reference types="react" />
import type { PopperOptions } from '../../helpers/Popper/Popper';
/** @deprecated Use PopperOptions instead */
export type MenuPopperProps = PopperOptions;
export interface MenuContainerProps {
    /** Menu to be rendered */
    menu: React.ReactElement<any, string | React.JSXElementConstructor<any>>;
    /** Reference to the menu */
    menuRef: React.RefObject<any>;
    /** Toggle to be rendered */
    toggle: React.ReactNode;
    /** Reference to the toggle */
    toggleRef: React.RefObject<any>;
    /** Flag to indicate if menu is opened.*/
    isOpen: boolean;
    /** Callback to change the open state of the menu.
     * Triggered by clicking outside of the menu, or by pressing any keys specified in onOpenChangeKeys. */
    onOpenChange?: (isOpen: boolean) => void;
    /** Keys that trigger onOpenChange, defaults to tab and escape. It is highly recommended to include Escape in the array, while Tab may be omitted if the menu contains non-menu items that are focusable. */
    onOpenChangeKeys?: string[];
    /** Callback to override the toggle keydown behavior. By default, when the toggle has focus and the menu is open, pressing the up/down arrow keys will focus a valid non-disabled menu item - the first item for the down arrow key and last item for the up arrow key. */
    onToggleKeydown?: (event: KeyboardEvent) => void;
    /** z-index of the dropdown menu */
    zIndex?: number;
    /** Additional properties to pass to the Popper */
    popperProps?: PopperOptions;
    /** @beta Flag indicating the first menu item should be focused after opening the dropdown. */
    shouldFocusFirstItemOnOpen?: boolean;
    /** Flag indicating if scroll on focus of the first menu item should occur. */
    shouldPreventScrollOnItemFocus?: boolean;
    /** Time in ms to wait before firing the toggles' focus event. Defaults to 0 */
    focusTimeoutDelay?: number;
}
/**
 * Container that links a menu and menu toggle together, to handle basic keyboard input and control the opening and closing of a menu.
 */
export declare const MenuContainer: React.FunctionComponent<MenuContainerProps>;
//# sourceMappingURL=MenuContainer.d.ts.map