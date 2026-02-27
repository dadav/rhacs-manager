/// <reference types="react" />
export interface MastheadLogoProps extends React.DetailedHTMLProps<React.HTMLProps<HTMLAnchorElement>, HTMLAnchorElement> {
    /** Content rendered inside of the masthead logo. */
    children?: React.ReactNode;
    /** Additional classes added to the masthead logo. */
    className?: string;
    /** Component type of the masthead logo. */
    component?: React.ElementType<any> | React.ComponentType<any>;
}
export declare const MastheadLogo: React.FunctionComponent<MastheadLogoProps>;
//# sourceMappingURL=MastheadLogo.d.ts.map