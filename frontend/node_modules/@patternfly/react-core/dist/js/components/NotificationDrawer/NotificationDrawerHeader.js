"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDrawerHeader = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const notification_drawer_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/NotificationDrawer/notification-drawer"));
const times_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/times-icon'));
const Button_1 = require("../Button");
const NotificationDrawerHeader = (_a) => {
    var { children, className = '', count, closeButtonAriaLabel = 'Close', customText, onClose, title = 'Notifications', unreadText = 'unread' } = _a, props = tslib_1.__rest(_a, ["children", "className", "count", "closeButtonAriaLabel", "customText", "onClose", "title", "unreadText"]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({}, props, { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerHeader, className), children: [(0, jsx_runtime_1.jsx)("h1", { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerHeaderTitle), children: title }), (customText !== undefined || count !== undefined) && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerHeaderStatus), "aria-live": "polite", children: customText || `${count} ${unreadText}` })), (children || onClose) && ((0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerHeaderAction), children: [children, onClose && ((0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: Button_1.ButtonVariant.plain, "aria-label": closeButtonAriaLabel, onClick: (event) => onClose(event), icon: (0, jsx_runtime_1.jsx)(times_icon_1.default, {}) }) }))] }))] })));
};
exports.NotificationDrawerHeader = NotificationDrawerHeader;
exports.NotificationDrawerHeader.displayName = 'NotificationDrawerHeader';
//# sourceMappingURL=NotificationDrawerHeader.js.map