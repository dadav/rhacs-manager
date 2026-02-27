import { Component } from 'react';
export interface SimpleListItemProps {
    /** id for the item. */
    itemId?: number | string;
    /** Content rendered inside the SimpleList item */
    children?: React.ReactNode;
    /** Additional classes added to the SimpleList <li> */
    className?: string;
    /** Component type of the SimpleList item */
    component?: 'button' | 'a';
    /** Additional classes added to the SimpleList <a> or <button> */
    componentClassName?: string;
    /** Additional props added to the SimpleList <a> or <button> */
    componentProps?: any;
    /** Indicates if the link is current/highlighted */
    isActive?: boolean;
    /** OnClick callback for the SimpleList item */
    onClick?: (event: React.MouseEvent | React.ChangeEvent) => void;
    /** Type of button SimpleList item */
    type?: 'button' | 'submit' | 'reset';
    /** Default hyperlink location */
    href?: string;
}
declare class SimpleListItem extends Component<SimpleListItemProps> {
    static displayName: string;
    ref: import("react").RefObject<any>;
    static defaultProps: SimpleListItemProps;
    render(): import("react/jsx-runtime").JSX.Element;
}
export { SimpleListItem };
//# sourceMappingURL=SimpleListItem.d.ts.map