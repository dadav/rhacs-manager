"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertToggleExpandButton = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Button_1 = require("../Button");
const AlertContext_1 = require("./AlertContext");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const react_styles_1 = require("@patternfly/react-styles");
const alert_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Alert/alert"));
const AlertToggleExpandButton = (_a) => {
    var { 'aria-label': ariaLabel = '', variantLabel, onToggleExpand, isExpanded = false } = _a, props = tslib_1.__rest(_a, ['aria-label', "variantLabel", "onToggleExpand", "isExpanded"]);
    const { title, variantLabel: alertVariantLabel } = (0, react_1.useContext)(AlertContext_1.AlertContext);
    return ((0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ variant: Button_1.ButtonVariant.plain, onClick: onToggleExpand, "aria-expanded": isExpanded, "aria-label": ariaLabel === '' ? `Toggle ${variantLabel || alertVariantLabel} alert: ${title}` : ariaLabel }, props, { icon: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(alert_1.default.alertToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) })));
};
exports.AlertToggleExpandButton = AlertToggleExpandButton;
exports.AlertToggleExpandButton.displayName = 'AlertToggleExpandButton';
//# sourceMappingURL=AlertToggleExpandButton.js.map