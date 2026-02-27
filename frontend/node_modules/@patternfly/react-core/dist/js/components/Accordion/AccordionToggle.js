"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccordionToggle = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const accordion_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Accordion/accordion"));
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const AccordionContext_1 = require("./AccordionContext");
const AccordionToggle = (_a) => {
    var { className = '', id, children = null, component } = _a, props = tslib_1.__rest(_a, ["className", "id", "children", "component"]);
    const renderToggleIcon = () => ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(accordion_1.default.accordionToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }));
    const { isExpanded } = (0, react_1.useContext)(AccordionContext_1.AccordionItemContext);
    return ((0, jsx_runtime_1.jsx)(AccordionContext_1.AccordionContext.Consumer, { children: ({ ToggleContainer, togglePosition }) => {
            const Container = component || ToggleContainer;
            const isToggleStartPositioned = togglePosition === 'start';
            return ((0, jsx_runtime_1.jsx)(Container, { children: (0, jsx_runtime_1.jsxs)("button", Object.assign({ id: id, className: (0, react_styles_1.css)(accordion_1.default.accordionToggle, isExpanded && accordion_1.default.modifiers.expanded, className), "aria-expanded": isExpanded, type: "button" }, props, { children: [isToggleStartPositioned && renderToggleIcon(), (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(accordion_1.default.accordionToggleText), children: children }), !isToggleStartPositioned && renderToggleIcon()] })) }));
        } }));
};
exports.AccordionToggle = AccordionToggle;
exports.AccordionToggle.displayName = 'AccordionToggle';
//# sourceMappingURL=AccordionToggle.js.map