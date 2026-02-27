import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Tile/tile.mjs';
import { css } from '@patternfly/react-styles';
export const Tile = (_a) => {
    var { children, title, icon, isStacked, isSelected, isDisabled, isDisplayLarge, className } = _a, props = __rest(_a, ["children", "title", "icon", "isStacked", "isSelected", "isDisabled", "isDisplayLarge", "className"]);
    return (_jsxs("div", Object.assign({ role: "option", "aria-selected": isSelected }, (isDisabled && { 'aria-disabled': isDisabled }), { className: css(styles.tile, isSelected && styles.modifiers.selected, isDisabled && styles.modifiers.disabled, isDisplayLarge && styles.modifiers.displayLg, className), tabIndex: 0 }, props, { children: [_jsxs("div", { className: css(styles.tileHeader, isStacked && styles.modifiers.stacked), children: [icon && _jsx("div", { className: css(styles.tileIcon), children: icon }), _jsx("div", { className: css(styles.tileTitle), children: title })] }), children && _jsx("div", { className: css(styles.tileBody), children: children })] })));
};
Tile.displayName = 'Tile';
//# sourceMappingURL=Tile.js.map