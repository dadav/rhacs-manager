"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationDrawerList = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const notification_drawer_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/NotificationDrawer/notification-drawer"));
const NotificationDrawerList = (_a) => {
    var { children, className = '', isHidden = false, 'aria-label': ariaLabel } = _a, props = tslib_1.__rest(_a, ["children", "className", "isHidden", 'aria-label']);
    return ((0, jsx_runtime_1.jsx)("ul", Object.assign({}, props, { className: (0, react_styles_1.css)(`${notification_drawer_1.default.notificationDrawer}__list`, className), hidden: isHidden, role: "list", "aria-label": ariaLabel, children: children })));
};
exports.NotificationDrawerList = NotificationDrawerList;
exports.NotificationDrawerList.displayName = 'NotificationDrawerList';
//# sourceMappingURL=NotificationDrawerList.js.map