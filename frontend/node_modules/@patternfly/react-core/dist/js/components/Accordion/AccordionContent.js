"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccordionContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const accordion_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Accordion/accordion"));
const AccordionContext_1 = require("./AccordionContext");
const AccordionExpandableContentBody_1 = require("./AccordionExpandableContentBody");
const AccordionContent = (_a) => {
    var { className = '', children = null, id = '', isFixed = false, isCustomContent = false, 'aria-label': ariaLabel = '', 'aria-labelledby': ariaLabelledby, component, contentBodyProps } = _a, props = tslib_1.__rest(_a, ["className", "children", "id", "isFixed", "isCustomContent", 'aria-label', 'aria-labelledby', "component", "contentBodyProps"]);
    const [hasScrollbar, setHasScrollbar] = (0, react_1.useState)(false);
    const containerRef = (0, react_1.useRef)(null);
    const { isExpanded } = (0, react_1.useContext)(AccordionContext_1.AccordionItemContext);
    (0, react_1.useEffect)(() => {
        if ((containerRef === null || containerRef === void 0 ? void 0 : containerRef.current) && isFixed && isExpanded) {
            const { offsetHeight, scrollHeight } = containerRef.current;
            setHasScrollbar(offsetHeight < scrollHeight);
        }
        else if (!isFixed) {
            setHasScrollbar(false);
        }
    }, [containerRef, isFixed, isExpanded]);
    return ((0, jsx_runtime_1.jsx)(AccordionContext_1.AccordionContext.Consumer, { children: ({ ContentContainer }) => {
            const Container = component || ContentContainer;
            return ((0, jsx_runtime_1.jsx)(Container, Object.assign({ ref: containerRef, id: id, className: (0, react_styles_1.css)(accordion_1.default.accordionExpandableContent, isFixed && accordion_1.default.modifiers.fixed, className), hidden: !isExpanded }, (ariaLabel && { 'aria-label': ariaLabel }), (ariaLabelledby && { 'aria-labelledby': ariaLabelledby }), (hasScrollbar && { tabIndex: 0 }), (hasScrollbar && Container === 'div' && { role: 'region' }), props, { children: isCustomContent ? (children) : ((0, jsx_runtime_1.jsx)(AccordionExpandableContentBody_1.AccordionExpandableContentBody, Object.assign({}, contentBodyProps, { children: children }))) })));
        } }));
};
exports.AccordionContent = AccordionContent;
exports.AccordionContent.displayName = 'AccordionContent';
//# sourceMappingURL=AccordionContent.js.map