import { __rest } from "tslib";
import { jsxs as _jsxs } from "react/jsx-runtime";
import { Component, Fragment } from 'react';
import { Label } from '../../../components/Label';
import { getOUIAProps, getDefaultOUIAId } from '../../../helpers';
class Chip extends Component {
    constructor(props) {
        super(props);
    }
    render() {
        const _a = this.props, { isOverflowChip, children, badge, onClick, className, textMaxWidth, isReadOnly, closeBtnAriaLabel, tooltipPosition, ouiaId, 
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        component } = _a, props = __rest(_a, ["isOverflowChip", "children", "badge", "onClick", "className", "textMaxWidth", "isReadOnly", "closeBtnAriaLabel", "tooltipPosition", "ouiaId", "component"]);
        return (_jsxs(Label, Object.assign({ variant: "outline", className: className, textMaxWidth: textMaxWidth, tooltipPosition: tooltipPosition }, (!isReadOnly &&
            !isOverflowChip && {
            onClose: onClick,
            closeBtnAriaLabel: closeBtnAriaLabel ? closeBtnAriaLabel : `Close ${children}`
        }), (isOverflowChip && { onClick, variant: 'overflow' }), getOUIAProps(isOverflowChip ? 'OverflowChip' : Chip.displayName, ouiaId !== undefined ? ouiaId : getDefaultOUIAId(Chip.displayName)), props, { children: [children, badge && _jsxs(Fragment, { children: [" ", badge] })] })));
    }
}
Chip.displayName = 'Chip';
Chip.defaultProps = {
    className: '',
    isOverflowChip: false,
    isReadOnly: false,
    tooltipPosition: 'top',
    onClick: (_e) => undefined,
    textMaxWidth: '16ch'
};
export { Chip };
//# sourceMappingURL=Chip.js.map