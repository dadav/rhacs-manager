import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { useContext, useEffect, useRef, useState } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Accordion/accordion.mjs';
import { AccordionContext, AccordionItemContext } from './AccordionContext';
import { AccordionExpandableContentBody } from './AccordionExpandableContentBody';
export const AccordionContent = (_a) => {
    var { className = '', children = null, id = '', isFixed = false, isCustomContent = false, 'aria-label': ariaLabel = '', 'aria-labelledby': ariaLabelledby, component, contentBodyProps } = _a, props = __rest(_a, ["className", "children", "id", "isFixed", "isCustomContent", 'aria-label', 'aria-labelledby', "component", "contentBodyProps"]);
    const [hasScrollbar, setHasScrollbar] = useState(false);
    const containerRef = useRef(null);
    const { isExpanded } = useContext(AccordionItemContext);
    useEffect(() => {
        if ((containerRef === null || containerRef === void 0 ? void 0 : containerRef.current) && isFixed && isExpanded) {
            const { offsetHeight, scrollHeight } = containerRef.current;
            setHasScrollbar(offsetHeight < scrollHeight);
        }
        else if (!isFixed) {
            setHasScrollbar(false);
        }
    }, [containerRef, isFixed, isExpanded]);
    return (_jsx(AccordionContext.Consumer, { children: ({ ContentContainer }) => {
            const Container = component || ContentContainer;
            return (_jsx(Container, Object.assign({ ref: containerRef, id: id, className: css(styles.accordionExpandableContent, isFixed && styles.modifiers.fixed, className), hidden: !isExpanded }, (ariaLabel && { 'aria-label': ariaLabel }), (ariaLabelledby && { 'aria-labelledby': ariaLabelledby }), (hasScrollbar && { tabIndex: 0 }), (hasScrollbar && Container === 'div' && { role: 'region' }), props, { children: isCustomContent ? (children) : (_jsx(AccordionExpandableContentBody, Object.assign({}, contentBodyProps, { children: children }))) })));
        } }));
};
AccordionContent.displayName = 'AccordionContent';
//# sourceMappingURL=AccordionContent.js.map