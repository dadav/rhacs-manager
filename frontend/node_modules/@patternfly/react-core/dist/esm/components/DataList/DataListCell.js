import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState, useEffect } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/DataList/data-list.mjs';
import { Tooltip } from '../Tooltip';
export const DataListCell = (_a) => {
    var { children = null, className = '', width = 1, isFilled = true, alignRight = false, isIcon = false, wrapModifier = null } = _a, props = __rest(_a, ["children", "className", "width", "isFilled", "alignRight", "isIcon", "wrapModifier"]);
    const cellRef = useRef(null);
    const [isTooltipVisible, setIsTooltipVisible] = useState(false);
    useEffect(() => {
        if (!cellRef.current || wrapModifier !== 'truncate') {
            return;
        }
        const showTooltip = cellRef.current && cellRef.current.offsetWidth < cellRef.current.scrollWidth;
        if (isTooltipVisible !== showTooltip) {
            setIsTooltipVisible(showTooltip);
        }
    }, [cellRef, wrapModifier, isTooltipVisible]);
    return (_jsxs("div", Object.assign({ className: css(styles.dataListCell, width > 1 && styles.modifiers[`flex_${width}`], !isFilled && styles.modifiers.noFill, alignRight && styles.modifiers.alignRight, isIcon && styles.modifiers.icon, className, wrapModifier && styles.modifiers[wrapModifier]) }, (isTooltipVisible && { tabIndex: 0 }), { ref: cellRef }, props, { children: [children, isTooltipVisible && _jsx(Tooltip, { content: children, triggerRef: cellRef })] })));
};
DataListCell.displayName = 'DataListCell';
//# sourceMappingURL=DataListCell.js.map