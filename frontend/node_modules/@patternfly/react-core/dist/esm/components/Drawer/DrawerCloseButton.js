import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Drawer/drawer.mjs';
import { css } from '@patternfly/react-styles';
import { Button } from '../Button';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
export const DrawerCloseButton = (_a) => {
    var { className = '', onClose = () => undefined, 'aria-label': ariaLabel = 'Close drawer panel' } = _a, props = __rest(_a, ["className", "onClose", 'aria-label']);
    return (_jsx("div", Object.assign({ className: css(styles.drawerClose, className) }, props, { children: _jsx(Button, { variant: "plain", onClick: onClose, "aria-label": ariaLabel, icon: _jsx(TimesIcon, {}) }) })));
};
DrawerCloseButton.displayName = 'DrawerCloseButton';
//# sourceMappingURL=DrawerCloseButton.js.map