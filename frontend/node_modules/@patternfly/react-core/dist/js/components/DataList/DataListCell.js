"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataListCell = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const data_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DataList/data-list"));
const Tooltip_1 = require("../Tooltip");
const DataListCell = (_a) => {
    var { children = null, className = '', width = 1, isFilled = true, alignRight = false, isIcon = false, wrapModifier = null } = _a, props = tslib_1.__rest(_a, ["children", "className", "width", "isFilled", "alignRight", "isIcon", "wrapModifier"]);
    const cellRef = (0, react_1.useRef)(null);
    const [isTooltipVisible, setIsTooltipVisible] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        if (!cellRef.current || wrapModifier !== 'truncate') {
            return;
        }
        const showTooltip = cellRef.current && cellRef.current.offsetWidth < cellRef.current.scrollWidth;
        if (isTooltipVisible !== showTooltip) {
            setIsTooltipVisible(showTooltip);
        }
    }, [cellRef, wrapModifier, isTooltipVisible]);
    return ((0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(data_list_1.default.dataListCell, width > 1 && data_list_1.default.modifiers[`flex_${width}`], !isFilled && data_list_1.default.modifiers.noFill, alignRight && data_list_1.default.modifiers.alignRight, isIcon && data_list_1.default.modifiers.icon, className, wrapModifier && data_list_1.default.modifiers[wrapModifier]) }, (isTooltipVisible && { tabIndex: 0 }), { ref: cellRef }, props, { children: [children, isTooltipVisible && (0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { content: children, triggerRef: cellRef })] })));
};
exports.DataListCell = DataListCell;
exports.DataListCell.displayName = 'DataListCell';
//# sourceMappingURL=DataListCell.js.map