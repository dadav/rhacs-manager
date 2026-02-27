/// <reference types="react" />
export interface CardHeaderActionsObject {
    /** Actions of the card header */
    actions: React.ReactNode;
    /** Flag indicating that the actions have no offset */
    hasNoOffset?: boolean;
    /** Additional classes added to the actions wrapper */
    className?: string;
}
export interface CardHeaderSelectableActionsObject {
    /** Determines the type of input to be used for a selectable card. */
    variant?: 'single' | 'multiple';
    /** Flag indicating that the actions have no offset */
    hasNoOffset?: boolean;
    /** Additional classes added to the selectable actions wrapper */
    className?: string;
    /** Custom ID passed to the selectable card's input or a clickable-only card's button/anchor.
     * If omitted, a random unique ID will be assigned to a selectable card's input. */
    selectableActionId?: string;
    /** Adds an accessible name to the input of a selectable card or clickable button/anchor of a clickable-only card.
     * This or selectableActionAriaLabelledby is required for clickable-only cards.
     */
    selectableActionAriaLabel?: string;
    /** A single or list of space-delimited ID's that provide an accessible name to the input of a selectable card
     * or clickable button/anchor of a clickable-only card. This or selectableActionAriaLabelledby is required
     * for clickable-only cards.
     */
    selectableActionAriaLabelledby?: string;
    /** Callback for when a selectable card input changes */
    onChange?: (event: React.FormEvent<HTMLInputElement>, checked: boolean) => void;
    /** Action to call when a clickable-only card is clicked. This cannot be combined with the to prop. */
    onClickAction?: (event: React.MouseEvent) => void;
    /** Link to navigate to when a clickable-only card is clicked. This cannot be combined with the onClickAction prop. */
    to?: string;
    /** Additional props spread to a selectable card input or clickable-only card's button/anchor. */
    selectableActionProps?: any;
    /** Flag to indicate whether a clickable-only card's link should open in a new tab/window. */
    isExternalLink?: boolean;
    /** Name for the input element of a selectable card. */
    name?: string;
    /** @deprecated Flag indicating whether the selectable card input is checked. We recommend using
     * the isSelected prop on the card component instead.
     */
    isChecked?: boolean;
    /** Flag indicating the action is hidden */
    isHidden?: boolean;
}
export interface CardHeaderProps extends React.HTMLProps<HTMLDivElement> {
    /** Content rendered inside the card header */
    children?: React.ReactNode;
    /** Additional classes added to the card header */
    className?: string;
    /** Actions of the card header */
    actions?: CardHeaderActionsObject;
    /** Selectable actions of the card header */
    selectableActions?: CardHeaderSelectableActionsObject;
    /** ID of the card header. */
    id?: string;
    /** Callback expandable card */
    onExpand?: (event: React.MouseEvent, id: string) => void;
    /** Additional props for expandable toggle button */
    toggleButtonProps?: any;
    /** Whether to right-align expandable toggle button */
    isToggleRightAligned?: boolean;
    /** Flag indicating that header wrapping is enabled */
    hasWrap?: boolean;
}
export declare const CardHeader: React.FunctionComponent<CardHeaderProps>;
//# sourceMappingURL=CardHeader.d.ts.map