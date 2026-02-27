import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/ToggleGroup/toggle-group.mjs';
export var ToggleGroupItemVariant;
(function (ToggleGroupItemVariant) {
    ToggleGroupItemVariant["icon"] = "icon";
    ToggleGroupItemVariant["text"] = "text";
})(ToggleGroupItemVariant || (ToggleGroupItemVariant = {}));
export const ToggleGroupItemElement = ({ variant, children }) => (_jsx("span", { className: css(variant === 'icon' && styles.toggleGroupIcon, variant === 'text' && styles.toggleGroupText), children: children }));
ToggleGroupItemElement.displayName = 'ToggleGroupItemElement';
//# sourceMappingURL=ToggleGroupItemElement.js.map