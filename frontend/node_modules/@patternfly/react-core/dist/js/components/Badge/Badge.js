"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Badge = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const badge_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Badge/badge"));
const Badge = (_a) => {
    var { isRead = false, isDisabled = false, className = '', children = '', screenReaderText } = _a, props = tslib_1.__rest(_a, ["isRead", "isDisabled", "className", "children", "screenReaderText"]);
    return ((0, jsx_runtime_1.jsxs)("span", Object.assign({}, props, { className: (0, react_styles_1.css)(badge_1.default.badge, (isRead ? badge_1.default.modifiers.read : badge_1.default.modifiers.unread), isDisabled && badge_1.default.modifiers.disabled, className), children: [children, screenReaderText && (0, jsx_runtime_1.jsx)("span", { className: "pf-v6-screen-reader", children: screenReaderText })] })));
};
exports.Badge = Badge;
exports.Badge.displayName = 'Badge';
//# sourceMappingURL=Badge.js.map