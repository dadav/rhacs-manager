import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/NotificationDrawer/notification-drawer.mjs';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import { Button, ButtonVariant } from '../Button';
export const NotificationDrawerHeader = (_a) => {
    var { children, className = '', count, closeButtonAriaLabel = 'Close', customText, onClose, title = 'Notifications', unreadText = 'unread' } = _a, props = __rest(_a, ["children", "className", "count", "closeButtonAriaLabel", "customText", "onClose", "title", "unreadText"]);
    return (_jsxs("div", Object.assign({}, props, { className: css(styles.notificationDrawerHeader, className), children: [_jsx("h1", { className: css(styles.notificationDrawerHeaderTitle), children: title }), (customText !== undefined || count !== undefined) && (_jsx("span", { className: css(styles.notificationDrawerHeaderStatus), "aria-live": "polite", children: customText || `${count} ${unreadText}` })), (children || onClose) && (_jsxs("div", { className: css(styles.notificationDrawerHeaderAction), children: [children, onClose && (_jsx("div", { children: _jsx(Button, { variant: ButtonVariant.plain, "aria-label": closeButtonAriaLabel, onClick: (event) => onClose(event), icon: _jsx(TimesIcon, {}) }) }))] }))] })));
};
NotificationDrawerHeader.displayName = 'NotificationDrawerHeader';
//# sourceMappingURL=NotificationDrawerHeader.js.map