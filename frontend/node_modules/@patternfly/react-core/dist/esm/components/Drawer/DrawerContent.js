import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useContext } from 'react';
import styles from '@patternfly/react-styles/css/components/Drawer/drawer.mjs';
import { css } from '@patternfly/react-styles';
import { DrawerMain } from './DrawerMain';
import { DrawerContext } from './Drawer';
export var DrawerContentColorVariant;
(function (DrawerContentColorVariant) {
    DrawerContentColorVariant["default"] = "default";
    DrawerContentColorVariant["primary"] = "primary";
    DrawerContentColorVariant["secondary"] = "secondary";
})(DrawerContentColorVariant || (DrawerContentColorVariant = {}));
export const DrawerContent = (_a) => {
    var { className, children, panelContent, colorVariant = DrawerContentColorVariant.default } = _a, props = __rest(_a, ["className", "children", "panelContent", "colorVariant"]);
    const { drawerContentRef } = useContext(DrawerContext);
    return (_jsxs(DrawerMain, { children: [_jsx("div", Object.assign({ className: css(styles.drawerContent, colorVariant === DrawerContentColorVariant.primary && styles.modifiers.primary, colorVariant === DrawerContentColorVariant.secondary && styles.modifiers.secondary, className), ref: drawerContentRef }, props, { children: children })), panelContent] }));
};
DrawerContent.displayName = 'DrawerContent';
//# sourceMappingURL=DrawerContent.js.map