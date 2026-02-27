import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Accordion/accordion.mjs';
import { AccordionItemContext } from './AccordionContext';
export const AccordionItem = (_a) => {
    var { children = null, className, isExpanded: isExpandedProp = false } = _a, props = __rest(_a, ["children", "className", "isExpanded"]);
    return (_jsx(AccordionItemContext.Provider, { value: {
            isExpanded: isExpandedProp
        }, children: _jsx("div", Object.assign({ className: css(styles.accordionItem, isExpandedProp && styles.modifiers.expanded, className) }, props, { children: children })) }));
};
AccordionItem.displayName = 'AccordionItem';
//# sourceMappingURL=AccordionItem.js.map