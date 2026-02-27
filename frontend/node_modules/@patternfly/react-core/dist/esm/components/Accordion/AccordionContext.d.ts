/// <reference types="react" />
interface AccordionContextProps {
    ContentContainer: React.ElementType;
    ToggleContainer: React.ElementType;
    togglePosition: 'start' | 'end';
}
interface AccordionItemContextProps {
    isExpanded?: boolean;
}
export declare const AccordionContext: import("react").Context<Partial<AccordionContextProps>>;
export declare const AccordionItemContext: import("react").Context<AccordionItemContextProps>;
export {};
//# sourceMappingURL=AccordionContext.d.ts.map