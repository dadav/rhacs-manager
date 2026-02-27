import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Drawer/drawer.mjs';
import { css } from '@patternfly/react-styles';
import { DrawerColorVariant } from './Drawer';
export const DrawerSection = (_a) => {
    var { className = '', children, colorVariant = DrawerColorVariant.default } = _a, props = __rest(_a, ["className", "children", "colorVariant"]);
    return (_jsx("div", Object.assign({ className: css(styles.drawerSection, colorVariant === DrawerColorVariant.noBackground && styles.modifiers.noBackground, colorVariant === DrawerColorVariant.secondary && styles.modifiers.secondary, className) }, props, { children: children })));
};
DrawerSection.displayName = 'DrawerSection';
//# sourceMappingURL=DrawerSection.js.map