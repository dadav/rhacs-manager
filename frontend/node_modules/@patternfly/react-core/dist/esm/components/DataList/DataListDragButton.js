import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/DataList/data-list.mjs';
import GripVerticalIcon from '@patternfly/react-icons/dist/esm/icons/grip-vertical-icon';
export const DataListDragButton = (_a) => {
    var { className = '', isDisabled = false } = _a, props = __rest(_a, ["className", "isDisabled"]);
    return (_jsx("button", Object.assign({ className: css(styles.dataListItemDraggableButton, isDisabled && styles.modifiers.disabled, className), type: "button", disabled: isDisabled }, props, { children: _jsx("span", { className: css(styles.dataListItemDraggableIcon), children: _jsx(GripVerticalIcon, {}) }) })));
};
DataListDragButton.displayName = 'DataListDragButton';
//# sourceMappingURL=DataListDragButton.js.map