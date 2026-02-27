"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Accordion = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const accordion_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Accordion/accordion"));
const AccordionContext_1 = require("./AccordionContext");
const Accordion = (_a) => {
    var { children = null, className = '', 'aria-label': ariaLabel, headingLevel = 'h3', asDefinitionList = true, isBordered = false, displaySize = 'default', togglePosition = 'end' } = _a, props = tslib_1.__rest(_a, ["children", "className", 'aria-label', "headingLevel", "asDefinitionList", "isBordered", "displaySize", "togglePosition"]);
    const AccordionList = asDefinitionList ? 'dl' : 'div';
    return ((0, jsx_runtime_1.jsx)(AccordionList, Object.assign({ className: (0, react_styles_1.css)(accordion_1.default.accordion, isBordered && accordion_1.default.modifiers.bordered, togglePosition === 'start' && accordion_1.default.modifiers.toggleStart, displaySize === 'lg' && accordion_1.default.modifiers.displayLg, className), "aria-label": ariaLabel }, (!asDefinitionList && ariaLabel && { role: 'region' }), props, { children: (0, jsx_runtime_1.jsx)(AccordionContext_1.AccordionContext.Provider, { value: {
                ContentContainer: asDefinitionList ? 'dd' : 'div',
                ToggleContainer: asDefinitionList ? 'dt' : headingLevel,
                togglePosition
            }, children: children }) })));
};
exports.Accordion = Accordion;
exports.Accordion.displayName = 'Accordion';
//# sourceMappingURL=Accordion.js.map