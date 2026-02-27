import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Drawer/drawer.mjs';
import { css } from '@patternfly/react-styles';
export const DrawerContentBody = (_a) => {
    var { className = '', children, hasPadding = false } = _a, props = __rest(_a, ["className", "children", "hasPadding"]);
    return (_jsx("div", Object.assign({ className: css(styles.drawerBody, hasPadding && styles.modifiers.padding, className) }, props, { children: children })));
};
DrawerContentBody.displayName = 'DrawerContentBody';
//# sourceMappingURL=DrawerContentBody.js.map