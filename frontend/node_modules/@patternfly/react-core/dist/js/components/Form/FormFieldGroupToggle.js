"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormFieldGroupToggle = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const form_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Form/form"));
const react_styles_1 = require("@patternfly/react-styles");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const Button_1 = require("../Button");
const FormFieldGroupToggle = (_a) => {
    var { className, onToggle, isExpanded, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, toggleId } = _a, props = tslib_1.__rest(_a, ["className", "onToggle", "isExpanded", 'aria-label', 'aria-labelledby', "toggleId"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(form_1.default.formFieldGroupToggle, className) }, props, { children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(form_1.default.formFieldGroupToggleButton), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "plain", "aria-label": ariaLabel, onClick: onToggle, "aria-expanded": isExpanded, "aria-labelledby": ariaLabelledby, id: toggleId, icon: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(form_1.default.formFieldGroupToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) }) }) })));
};
exports.FormFieldGroupToggle = FormFieldGroupToggle;
exports.FormFieldGroupToggle.displayName = 'FormFieldGroupToggle';
//# sourceMappingURL=FormFieldGroupToggle.js.map