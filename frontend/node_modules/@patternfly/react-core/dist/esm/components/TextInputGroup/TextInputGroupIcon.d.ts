/// <reference types="react" />
export interface TextInputGroupIconProps extends React.HTMLProps<HTMLSpanElement> {
    /** Content rendered inside the text input group utilities div */
    children?: React.ReactNode;
    /** Additional classes applied to the text input group utilities container */
    className?: string;
    /** Flag indicating if the icon is a status icon and should inherit status styling. */
    isStatus?: boolean;
}
export declare const TextInputGroupIcon: React.FunctionComponent<TextInputGroupIconProps>;
//# sourceMappingURL=TextInputGroupIcon.d.ts.map