import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import modalStyles from '@patternfly/react-styles/css/components/ModalBox/modal-box.mjs';
import { css } from '@patternfly/react-styles';
import { capitalize } from '../../helpers';
import { Tooltip } from '../Tooltip';
import CheckCircleIcon from '@patternfly/react-icons/dist/esm/icons/check-circle-icon';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';
import ExclamationTriangleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon';
import InfoCircleIcon from '@patternfly/react-icons/dist/esm/icons/info-circle-icon';
import BellIcon from '@patternfly/react-icons/dist/esm/icons/bell-icon';
import { useIsomorphicLayoutEffect } from '../../helpers';
export const isVariantIcon = (icon) => ['success', 'danger', 'warning', 'info', 'custom'].includes(icon);
export const ModalBoxTitle = (_a) => {
    var { className, id, title, titleIconVariant, titleScreenReaderText } = _a, props = __rest(_a, ["className", "id", "title", "titleIconVariant", "titleScreenReaderText"]);
    const [hasTooltip, setHasTooltip] = useState(false);
    const h1 = useRef(null);
    const label = titleScreenReaderText ||
        (isVariantIcon(titleIconVariant) ? `${capitalize(titleIconVariant)} alert:` : titleScreenReaderText);
    const variantIcons = {
        success: _jsx(CheckCircleIcon, {}),
        danger: _jsx(ExclamationCircleIcon, {}),
        warning: _jsx(ExclamationTriangleIcon, {}),
        info: _jsx(InfoCircleIcon, {}),
        custom: _jsx(BellIcon, {})
    };
    const CustomIcon = !isVariantIcon(titleIconVariant) && titleIconVariant;
    useIsomorphicLayoutEffect(() => {
        setHasTooltip(h1.current && h1.current.offsetWidth < h1.current.scrollWidth);
    }, []);
    const content = (_jsxs("h1", Object.assign({ id: id, ref: h1, className: css(modalStyles.modalBoxTitle, titleIconVariant && modalStyles.modifiers.icon, isVariantIcon(titleIconVariant) && modalStyles.modifiers[titleIconVariant], className) }, props, { children: [titleIconVariant && (_jsx("span", { className: css(modalStyles.modalBoxTitleIcon), children: isVariantIcon(titleIconVariant) ? variantIcons[titleIconVariant] : _jsx(CustomIcon, {}) })), label && _jsx("span", { className: "pf-v6-screen-reader", children: label }), _jsx("span", { className: css(modalStyles.modalBoxTitleText), children: title })] })));
    return hasTooltip ? _jsx(Tooltip, { content: title, children: content }) : content;
};
ModalBoxTitle.displayName = 'ModalBoxTitle';
//# sourceMappingURL=ModalBoxTitle.js.map