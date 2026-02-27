"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = exports.EmptyStateStatus = exports.EmptyStateVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const empty_state_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/EmptyState/empty-state"));
const EmptyStateHeader_1 = require("./EmptyStateHeader");
const helpers_1 = require("../../helpers");
var EmptyStateVariant;
(function (EmptyStateVariant) {
    EmptyStateVariant["xs"] = "xs";
    EmptyStateVariant["sm"] = "sm";
    EmptyStateVariant["lg"] = "lg";
    EmptyStateVariant["xl"] = "xl";
    EmptyStateVariant["full"] = "full";
})(EmptyStateVariant || (exports.EmptyStateVariant = EmptyStateVariant = {}));
var EmptyStateStatus;
(function (EmptyStateStatus) {
    EmptyStateStatus["danger"] = "danger";
    EmptyStateStatus["warning"] = "warning";
    EmptyStateStatus["success"] = "success";
    EmptyStateStatus["info"] = "info";
    EmptyStateStatus["custom"] = "custom";
})(EmptyStateStatus || (exports.EmptyStateStatus = EmptyStateStatus = {}));
const EmptyState = (_a) => {
    var { children, className, variant = EmptyStateVariant.full, isFullHeight, status, icon: customIcon, titleText, titleClassName, headerClassName, headingLevel } = _a, props = tslib_1.__rest(_a, ["children", "className", "variant", "isFullHeight", "status", "icon", "titleText", "titleClassName", "headerClassName", "headingLevel"]);
    const statusIcon = status && helpers_1.statusIcons[status];
    const icon = customIcon || statusIcon;
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(empty_state_1.default.emptyState, variant !== 'full' && empty_state_1.default.modifiers[variant], isFullHeight && empty_state_1.default.modifiers.fullHeight, status && empty_state_1.default.modifiers[status], className) }, props, { children: (0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(empty_state_1.default.emptyStateContent), children: [(0, jsx_runtime_1.jsx)(EmptyStateHeader_1.EmptyStateHeader, { icon: icon, titleText: titleText, titleClassName: titleClassName, className: headerClassName, headingLevel: headingLevel }), children] }) })));
};
exports.EmptyState = EmptyState;
exports.EmptyState.displayName = 'EmptyState';
//# sourceMappingURL=EmptyState.js.map