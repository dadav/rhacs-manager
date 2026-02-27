"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chip = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Label_1 = require("../../../components/Label");
const helpers_1 = require("../../../helpers");
class Chip extends react_1.Component {
    constructor(props) {
        super(props);
    }
    render() {
        const _a = this.props, { isOverflowChip, children, badge, onClick, className, textMaxWidth, isReadOnly, closeBtnAriaLabel, tooltipPosition, ouiaId, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        component } = _a, props = tslib_1.__rest(_a, ["isOverflowChip", "children", "badge", "onClick", "className", "textMaxWidth", "isReadOnly", "closeBtnAriaLabel", "tooltipPosition", "ouiaId", "component"]);
        return ((0, jsx_runtime_1.jsxs)(Label_1.Label, Object.assign({ variant: "outline", className: className, textMaxWidth: textMaxWidth, tooltipPosition: tooltipPosition }, (!isReadOnly &&
            !isOverflowChip && {
            onClose: onClick,
            closeBtnAriaLabel: closeBtnAriaLabel ? closeBtnAriaLabel : `Close ${children}`
        }), (isOverflowChip && { onClick, variant: 'overflow' }), (0, helpers_1.getOUIAProps)(isOverflowChip ? 'OverflowChip' : Chip.displayName, ouiaId !== undefined ? ouiaId : (0, helpers_1.getDefaultOUIAId)(Chip.displayName)), props, { children: [children, badge && (0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [" ", badge] })] })));
    }
}
exports.Chip = Chip;
Chip.displayName = 'Chip';
Chip.defaultProps = {
    className: '',
    isOverflowChip: false,
    isReadOnly: false,
    tooltipPosition: 'top',
    onClick: (_e) => undefined,
    textMaxWidth: '16ch'
};
//# sourceMappingURL=Chip.js.map