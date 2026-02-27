"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardNav = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const wizard_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Wizard/wizard"));
const react_styles_1 = require("@patternfly/react-styles");
const helpers_1 = require("../../../helpers");
const WizardNav = ({ children, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, isOpen = false, returnList = false, ouiaId, ouiaSafe = true }) => {
    const ouiaProps = (0, helpers_1.useOUIAProps)(exports.WizardNav.displayName, ouiaId, ouiaSafe);
    const innerList = ((0, jsx_runtime_1.jsx)("ol", { className: (0, react_styles_1.css)(wizard_1.default.wizardNavList), role: "list", children: children }));
    if (returnList) {
        return innerList;
    }
    return ((0, jsx_runtime_1.jsx)("nav", Object.assign({ className: (0, react_styles_1.css)(wizard_1.default.wizardNav, isOpen && wizard_1.default.modifiers.expanded), "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy }, ouiaProps, { children: (0, jsx_runtime_1.jsx)("ol", { className: (0, react_styles_1.css)(wizard_1.default.wizardNavList), role: "list", children: children }) })));
};
exports.WizardNav = WizardNav;
exports.WizardNav.displayName = 'WizardNav';
//# sourceMappingURL=WizardNav.js.map