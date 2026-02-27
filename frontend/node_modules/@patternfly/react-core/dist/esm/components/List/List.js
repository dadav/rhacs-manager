import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/List/list.mjs';
import { css } from '@patternfly/react-styles';
export var OrderType;
(function (OrderType) {
    OrderType["number"] = "1";
    OrderType["lowercaseLetter"] = "a";
    OrderType["uppercaseLetter"] = "A";
    OrderType["lowercaseRomanNumber"] = "i";
    OrderType["uppercaseRomanNumber"] = "I";
})(OrderType || (OrderType = {}));
export var ListVariant;
(function (ListVariant) {
    ListVariant["inline"] = "inline";
})(ListVariant || (ListVariant = {}));
export var ListComponent;
(function (ListComponent) {
    ListComponent["ol"] = "ol";
    ListComponent["ul"] = "ul";
})(ListComponent || (ListComponent = {}));
export const List = (_a) => {
    var { className = '', children = null, variant = null, isBordered = false, isPlain = false, iconSize = 'default', type = OrderType.number, ref = null, component = ListComponent.ul, 'aria-label': ariaLabel } = _a, props = __rest(_a, ["className", "children", "variant", "isBordered", "isPlain", "iconSize", "type", "ref", "component", 'aria-label']);
    return component === ListComponent.ol ? (_jsx("ol", Object.assign({ ref: ref, type: type, "aria-label": ariaLabel }, (isPlain && { role: 'list' }), props, { className: css(styles.list, variant && styles.modifiers[variant], isBordered && styles.modifiers.bordered, isPlain && styles.modifiers.plain, iconSize && iconSize === 'large' && styles.modifiers.iconLg, className), children: children }))) : (_jsx("ul", Object.assign({ ref: ref, "aria-label": ariaLabel }, (isPlain && { role: 'list' }), props, { className: css(styles.list, variant && styles.modifiers[variant], isBordered && styles.modifiers.bordered, isPlain && styles.modifiers.plain, iconSize && iconSize === 'large' && styles.modifiers.iconLg, className), children: children })));
};
List.displayName = 'List';
//# sourceMappingURL=List.js.map