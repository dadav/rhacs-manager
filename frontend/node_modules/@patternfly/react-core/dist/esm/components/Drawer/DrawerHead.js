import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Drawer/drawer.mjs';
import { css } from '@patternfly/react-styles';
export const DrawerHead = (_a) => {
    var { className = '', children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx("div", Object.assign({ className: css(styles.drawerHead, className) }, props, { children: children })));
};
DrawerHead.displayName = 'DrawerHead';
//# sourceMappingURL=DrawerHead.js.map