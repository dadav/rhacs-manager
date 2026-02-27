"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardNav = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const wizard_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Wizard/wizard"));
const react_styles_1 = require("@patternfly/react-styles");
const WizardNav = (_a) => {
    var { children, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, isExpanded = false, isInnerList = false, className } = _a, props = tslib_1.__rest(_a, ["children", 'aria-label', 'aria-labelledby', "isExpanded", "isInnerList", "className"]);
    if (isInnerList) {
        return ((0, jsx_runtime_1.jsx)("ol", Object.assign({ className: (0, react_styles_1.css)(wizard_1.default.wizardNavList, className), role: "list" }, props, { children: children })));
    }
    return ((0, jsx_runtime_1.jsx)("nav", Object.assign({ className: (0, react_styles_1.css)(wizard_1.default.wizardNav, isExpanded && wizard_1.default.modifiers.expanded, className), "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy }, props, { children: (0, jsx_runtime_1.jsx)("ol", { className: (0, react_styles_1.css)(wizard_1.default.wizardNavList), role: "list", children: children }) })));
};
exports.WizardNav = WizardNav;
exports.WizardNav.displayName = 'WizardNav';
//# sourceMappingURL=WizardNav.js.map