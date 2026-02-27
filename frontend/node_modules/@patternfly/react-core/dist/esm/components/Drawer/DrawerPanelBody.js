import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Drawer/drawer.mjs';
import { css } from '@patternfly/react-styles';
export const DrawerPanelBody = (_a) => {
    var { className = '', children, hasNoPadding = false } = _a, props = __rest(_a, ["className", "children", "hasNoPadding"]);
    return (_jsx("div", Object.assign({ className: css(styles.drawerBody, hasNoPadding && styles.modifiers.noPadding, className) }, props, { children: children })));
};
DrawerPanelBody.displayName = 'DrawerPanelBody';
//# sourceMappingURL=DrawerPanelBody.js.map