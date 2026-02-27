/// <reference types="react" />
import { AccordionExpandableContentBodyProps } from './AccordionExpandableContentBody';
export interface AccordionContentProps extends React.HTMLProps<HTMLDivElement> {
    /** Content rendered inside the Accordion  */
    children?: React.ReactNode;
    /** Additional classes added to the Accordion content  */
    className?: string;
    /** Identify the AccordionContent item  */
    id?: string;
    /** Flag to indicate Accordion content is fixed  */
    isFixed?: boolean;
    /** Adds accessible text to the Accordion content */
    'aria-label'?: string;
    /** Id of the controlling accordion toggle to label the content. */
    'aria-labelledby'?: string;
    /** Component to use as content container */
    component?: React.ElementType;
    /** Flag indicating content is custom. Expanded content Body wrapper will be removed from children.  This allows multiple bodies to be rendered as content. */
    isCustomContent?: React.ReactNode;
    /** Props passed to the AccordionExpandableContentBody **/
    contentBodyProps?: AccordionExpandableContentBodyProps;
}
export declare const AccordionContent: React.FunctionComponent<AccordionContentProps>;
//# sourceMappingURL=AccordionContent.d.ts.map