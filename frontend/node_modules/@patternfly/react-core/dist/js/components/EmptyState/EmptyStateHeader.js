"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyStateHeader = exports.EmptyStateHeadingLevel = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const empty_state_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/EmptyState/empty-state"));
const EmptyStateIcon_1 = require("./EmptyStateIcon");
var EmptyStateHeadingLevel;
(function (EmptyStateHeadingLevel) {
    EmptyStateHeadingLevel["h1"] = "h1";
    EmptyStateHeadingLevel["h2"] = "h2";
    EmptyStateHeadingLevel["h3"] = "h3";
    EmptyStateHeadingLevel["h4"] = "h4";
    EmptyStateHeadingLevel["h5"] = "h5";
    EmptyStateHeadingLevel["h6"] = "h6";
})(EmptyStateHeadingLevel || (exports.EmptyStateHeadingLevel = EmptyStateHeadingLevel = {}));
const EmptyStateHeader = (_a) => {
    var { className, titleClassName, titleText, headingLevel: HeadingLevel = EmptyStateHeadingLevel.h1, icon: Icon } = _a, props = tslib_1.__rest(_a, ["className", "titleClassName", "titleText", "headingLevel", "icon"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(`${empty_state_1.default.emptyState}__header`, className) }, props, { children: [Icon && (0, jsx_runtime_1.jsx)(EmptyStateIcon_1.EmptyStateIcon, { icon: Icon }), titleText && ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(`${empty_state_1.default.emptyState}__title`), children: (0, jsx_runtime_1.jsx)(HeadingLevel, { className: (0, react_styles_1.css)(empty_state_1.default.emptyStateTitleText, titleClassName), children: titleText }) }))] })));
};
exports.EmptyStateHeader = EmptyStateHeader;
exports.EmptyStateHeader.displayName = 'EmptyStateHeader';
//# sourceMappingURL=EmptyStateHeader.js.map