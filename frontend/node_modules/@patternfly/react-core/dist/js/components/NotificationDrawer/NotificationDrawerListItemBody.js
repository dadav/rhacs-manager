"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDrawerListItemBody = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const notification_drawer_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/NotificationDrawer/notification-drawer"));
const NotificationDrawerListItemBody = (_a) => {
    var { children, className = '', timestamp } = _a, props = tslib_1.__rest(_a, ["children", "className", "timestamp"]);
    return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("div", Object.assign({}, props, { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerListItemDescription, className), children: children })), timestamp && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(notification_drawer_1.default.notificationDrawerListItemTimestamp, className), children: timestamp })] }));
};
exports.NotificationDrawerListItemBody = NotificationDrawerListItemBody;
exports.NotificationDrawerListItemBody.displayName = 'NotificationDrawerListItemBody';
//# sourceMappingURL=NotificationDrawerListItemBody.js.map