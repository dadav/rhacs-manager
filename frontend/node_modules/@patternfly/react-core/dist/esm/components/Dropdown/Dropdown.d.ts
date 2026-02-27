/// <reference types="react" />
import { MenuProps } from '../Menu';
import { PopperOptions } from '../../helpers/Popper/Popper';
import type { DropdownItemProps } from './DropdownItem';
import { OUIAProps } from '../../helpers';
/** @deprecated Use PopperOptions instead */
export type DropdownPopperProps = PopperOptions;
export interface DropdownToggleProps {
    /**  Dropdown toggle node. */
    toggleNode: React.ReactNode;
    /** Reference to the toggle. */
    toggleRef?: React.RefObject<HTMLButtonElement | null>;
}
/**
 * See the Menu documentation for additional props that may be passed.
 */
export interface DropdownProps extends MenuProps, OUIAProps {
    /** Anything which can be rendered in a dropdown. */
    children?: React.ReactNode;
    /** Classes applied to root element of dropdown. */
    className?: string;
    /** Dropdown toggle. The toggle should either be a renderer function which forwards the given toggle ref, or a direct ReactNode that should be passed along with the toggleRef property. */
    toggle: DropdownToggleProps | ((toggleRef: React.RefObject<any>) => React.ReactNode);
    /** Flag to indicate if menu is opened.*/
    isOpen?: boolean;
    /** Flag indicating the toggle should be focused after a selection. If this use case is too restrictive, the optional toggleRef property with a node toggle may be used to control focus. */
    shouldFocusToggleOnSelect?: boolean;
    /** Function callback called when user selects item. */
    onSelect?: (event?: React.MouseEvent<Element, MouseEvent>, value?: DropdownItemProps['value']) => void;
    /** Callback to allow the dropdown component to change the open state of the menu.
     * Triggered by clicking outside of the menu, or by pressing any keys specified in onOpenChangeKeys. */
    onOpenChange?: (isOpen: boolean) => void;
    /** Keys that trigger onOpenChange, defaults to tab and escape. It is highly recommended to include Escape in the array, while Tab may be omitted if the menu contains non-menu items that are focusable. */
    onOpenChangeKeys?: string[];
    /** Callback to override the toggle keydown behavior. By default, when the toggle has focus and the menu is open, pressing the up/down arrow keys will focus a valid non-disabled menu item - the first item for the down arrow key and last item for the up arrow key. */
    onToggleKeydown?: (event: KeyboardEvent) => void;
    /** Indicates if the menu should be without the outer box-shadow. */
    isPlain?: boolean;
    /** Indicates if the menu should be scrollable. */
    isScrollable?: boolean;
    /** @hide Forwarded ref */
    innerRef?: React.Ref<any>;
    /** Value to overwrite the randomly generated data-ouia-component-id.*/
    ouiaId?: number | string;
    /** Set the value of data-ouia-safe. Only set to true when the component is in a static state, i.e. no animations are occurring. At all other times, this value must be false. */
    ouiaSafe?: boolean;
    /** z-index of the dropdown menu */
    zIndex?: number;
    /** Additional properties to pass to the Popper */
    popperProps?: PopperOptions;
    /** Height of the dropdown menu */
    menuHeight?: string;
    /** Maximum height of dropdown menu */
    maxMenuHeight?: string;
    /** @beta Flag indicating the first menu item should be focused after opening the dropdown. */
    shouldFocusFirstItemOnOpen?: boolean;
    /** Flag indicating if scroll on focus of the first menu item should occur. */
    shouldPreventScrollOnItemFocus?: boolean;
    /** Time in ms to wait before firing the toggles' focus event. Defaults to 0 */
    focusTimeoutDelay?: number;
}
export declare const Dropdown: import("react").ForwardRefExoticComponent<DropdownProps & import("react").RefAttributes<any>>;
//# sourceMappingURL=Dropdown.d.ts.map