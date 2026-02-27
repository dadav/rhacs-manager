/// <reference types="react" />
export declare enum ToolbarGroupVariant {
    'filter-group' = "filter-group",
    'action-group' = "action-group",
    'action-group-inline' = "action-group-inline",
    'action-group-plain' = "action-group-plain",
    'label-group' = "label-group"
}
export interface ToolbarGroupProps extends Omit<React.HTMLProps<HTMLDivElement>, 'ref' | 'onToggle'> {
    /** Classes applied to root element of the data toolbar group */
    className?: string;
    /** A type modifier which modifies spacing specifically depending on the type of group */
    variant?: ToolbarGroupVariant | 'filter-group' | 'action-group' | 'action-group-inline' | 'action-group-plain' | 'label-group';
    /** Visibility at various breakpoints. */
    visibility?: {
        default?: 'hidden' | 'visible';
        md?: 'hidden' | 'visible';
        lg?: 'hidden' | 'visible';
        xl?: 'hidden' | 'visible';
        '2xl'?: 'hidden' | 'visible';
    };
    /** Applies to a child of a flex layout, and aligns that child (and any adjacent children on the other side of it) to one side of the main axis */
    align?: {
        default?: 'alignEnd' | 'alignStart' | 'alignCenter';
        md?: 'alignEnd' | 'alignStart' | 'alignCenter';
        lg?: 'alignEnd' | 'alignStart' | 'alignCenter';
        xl?: 'alignEnd' | 'alignStart' | 'alignCenter';
        '2xl'?: 'alignEnd' | 'alignStart' | 'alignCenter';
    };
    /** Vertical alignment of children */
    alignItems?: 'start' | 'center' | 'baseline' | 'default' | 'end' | 'stretch';
    /** Vertical alignment */
    alignSelf?: 'start' | 'center' | 'baseline' | 'default' | 'end' | 'stretch';
    /** Sets both the column and row gap at various breakpoints. */
    gap?: {
        default?: 'gapNone' | 'gapXs' | 'gapSm' | 'gapMd' | 'gapLg' | 'gapXl' | 'gap_2xl' | 'gap_3xl' | 'gap_4xl';
        md?: 'gapNone' | 'gapXs' | 'gapSm' | 'gapMd' | 'gapLg' | 'gapXl' | 'gap_2xl' | 'gap_3xl' | 'gap_4xl';
        lg?: 'gapNone' | 'gapXs' | 'gapSm' | 'gapMd' | 'gapLg' | 'gapXl' | 'gap_2xl' | 'gap_3xl' | 'gap_4xl';
        xl?: 'gapNone' | 'gapXs' | 'gapSm' | 'gapMd' | 'gapLg' | 'gapXl' | 'gap_2xl' | 'gap_3xl' | 'gap_4xl';
        '2xl'?: 'gapNone' | 'gapXs' | 'gapSm' | 'gapMd' | 'gapLg' | 'gapXl' | 'gap_2xl' | 'gap_3xl' | 'gap_4xl';
    };
    /** Sets only the column gap at various breakpoints. */
    columnGap?: {
        default?: 'columnGapNone' | 'columnGapXs' | 'columnGapSm' | 'columnGapMd' | 'columnGapLg' | 'columnGapXl' | 'columnGap_2xl' | 'columnGap_3xl' | 'columnGap_4xl';
        md?: 'columnGapNone' | 'columnGapXs' | 'columnGapSm' | 'columnGapMd' | 'columnGapLg' | 'columnGapXl' | 'columnGap_2xl' | 'columnGap_3xl' | 'columnGap_4xl';
        lg?: 'columnGapNone' | 'columnGapXs' | 'columnGapSm' | 'columnGapMd' | 'columnGapLg' | 'columnGapXl' | 'columnGap_2xl' | 'columnGap_3xl' | 'columnGap_4xl';
        xl?: 'columnGapNone' | 'columnGapXs' | 'columnGapSm' | 'columnGapMd' | 'columnGapLg' | 'columnGapXl' | 'columnGap_2xl' | 'columnGap_3xl' | 'columnGap_4xl';
        '2xl'?: 'columnGapNone' | 'columnGapXs' | 'columnGapSm' | 'columnGapMd' | 'columnGapLg' | 'columnGapXl' | 'columnGap_2xl' | 'columnGap_3xl' | 'columnGap_4xl';
    };
    /** Sets only the row gap at various breakpoints. */
    rowGap?: {
        default?: 'rowGapNone' | 'rowGapXs' | 'rowGapSm' | 'rowGapMd' | 'rowGapLg' | 'rowGapXl' | 'rowGap_2xl' | 'rowGap_3xl' | 'rowGap_4xl';
        md?: 'rowGapNone' | 'rowGapXs' | 'rowGapSm' | 'rowGapMd' | 'rowGapLg' | 'rowGapXl' | 'rowGap_2xl' | 'rowGap_3xl' | 'rowGap_4xl';
        lg?: 'rowGapNone' | 'rowGapXs' | 'rowGapSm' | 'rowGapMd' | 'rowGapLg' | 'rowGapXl' | 'rowGap_2xl' | 'rowGap_3xl' | 'rowGap_4xl';
        xl?: 'rowGapNone' | 'rowGapXs' | 'rowGapSm' | 'rowGapMd' | 'rowGapLg' | 'rowGapXl' | 'rowGap_2xl' | 'rowGap_3xl' | 'rowGap_4xl';
        '2xl'?: 'rowGapNone' | 'rowGapXs' | 'rowGapSm' | 'rowGapMd' | 'rowGapLg' | 'rowGapXl' | 'rowGap_2xl' | 'rowGap_3xl' | 'rowGap_4xl';
    };
    /** Value to set for row wrapping at various breakpoints */
    rowWrap?: {
        default?: 'wrap' | 'nowrap';
        sm?: 'wrap' | 'nowrap';
        md?: 'wrap' | 'nowrap';
        lg?: 'wrap' | 'nowrap';
        xl?: 'wrap' | 'nowrap';
        '2xl'?: 'wrap' | 'nowrap';
    };
    /** Content to be rendered inside the data toolbar group */
    children?: React.ReactNode;
    /** Flag that modifies the toolbar group to hide overflow and respond to available space. Used for horizontal navigation. */
    isOverflowContainer?: boolean;
    /** @hide Reference to pass to this group if it has .pf-m-label-container modifier */
    innerRef?: React.RefObject<any>;
}
export declare const ToolbarGroup: import("react").ForwardRefExoticComponent<ToolbarGroupProps & import("react").RefAttributes<unknown>>;
//# sourceMappingURL=ToolbarGroup.d.ts.map