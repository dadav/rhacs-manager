import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import backgroundImage from '@patternfly/react-tokens/dist/esm/c_about_modal_box_BackgroundImage';
import { AboutModalBoxContent } from './AboutModalBoxContent';
import { AboutModalBoxHeader } from './AboutModalBoxHeader';
import { AboutModalBoxBrand } from './AboutModalBoxBrand';
import { AboutModalBoxCloseButton } from './AboutModalBoxCloseButton';
import { AboutModalBox } from './AboutModalBox';
import { Modal, ModalVariant } from '../Modal';
import { GenerateId } from '../../helpers/GenerateId/GenerateId';
export const AboutModal = (_a) => {
    var { children, className, isOpen = false, onClose = (_e) => undefined, productName, trademark, backgroundImageSrc, brandImageSrc, brandImageAlt, hasNoContentContainer = false, appendTo, closeButtonAriaLabel, 'aria-label': ariaLabel, disableFocusTrap } = _a, props = __rest(_a, ["children", "className", "isOpen", "onClose", "productName", "trademark", "backgroundImageSrc", "brandImageSrc", "brandImageAlt", "hasNoContentContainer", "appendTo", "closeButtonAriaLabel", 'aria-label', "disableFocusTrap"]);
    if (brandImageSrc && !brandImageAlt) {
        // eslint-disable-next-line no-console
        console.error('AboutModal:', 'brandImageAlt is required when a brandImageSrc is specified, and should not be an empty string.');
    }
    if (!productName && !ariaLabel) {
        // eslint-disable-next-line no-console
        console.error('AboutModal:', 'Either productName or ariaLabel is required for component to be accessible');
    }
    if (!isOpen) {
        return null;
    }
    return (_jsx(GenerateId, { prefix: "pf-about-modal-title-", children: (ariaLabelledBy) => (_jsx(Modal, Object.assign({ isOpen: isOpen, variant: ModalVariant.large }, (productName && { 'aria-labelledby': ariaLabelledBy }), { "aria-label": ariaLabel, onEscapePress: onClose, appendTo: appendTo, disableFocusTrap: disableFocusTrap, children: _jsxs(AboutModalBox, { style: backgroundImageSrc
                    ? { [backgroundImage.name]: `url(${backgroundImageSrc})` }
                    : {}, className: css(className), children: [_jsx(AboutModalBoxBrand, { src: brandImageSrc, alt: brandImageAlt }), _jsx(AboutModalBoxCloseButton, { "aria-label": closeButtonAriaLabel, onClose: onClose }), productName && _jsx(AboutModalBoxHeader, { id: ariaLabelledBy, productName: productName }), _jsx(AboutModalBoxContent, Object.assign({ trademark: trademark, hasNoContentContainer: hasNoContentContainer }, props, { children: children }))] }) }))) }));
};
AboutModal.displayName = 'AboutModal';
//# sourceMappingURL=AboutModal.js.map