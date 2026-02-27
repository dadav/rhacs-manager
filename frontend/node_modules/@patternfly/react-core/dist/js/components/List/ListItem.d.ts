/// <reference types="react" />
export interface ListItemProps extends React.HTMLProps<HTMLLIElement> {
    /** Additional classes added to the list item */
    className?: string;
    /** Anything that can be rendered inside of list item */
    children: React.ReactNode;
    /** Icon for the list item */
    icon?: React.ReactNode | null;
}
export declare const ListItem: React.FunctionComponent<ListItemProps>;
//# sourceMappingURL=ListItem.d.ts.map