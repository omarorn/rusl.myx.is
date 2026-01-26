import { describe, it, expect } from 'vitest';
import {
  checkOverrides,
  mapLabelToBin,
  getBinInfoForRegion,
  getReasonText,
  HF_LABEL_TO_BIN,
  ICELAND_OVERRIDES,
  BIN_INFO,
} from '../services/iceland-rules';

describe('iceland-rules', () => {
  describe('checkOverrides', () => {
    // Critical: PLA/3D printed plastics → mixed
    it('should return mixed for PLA', () => {
      expect(checkOverrides('PLA filament')).toBe('mixed');
      expect(checkOverrides('pla plastic')).toBe('mixed');
    });

    it('should return mixed for 3D printed items', () => {
      expect(checkOverrides('3D printed vase')).toBe('mixed');
      expect(checkOverrides('3d print')).toBe('mixed');
    });

    it('should return mixed for ABS and PETG', () => {
      expect(checkOverrides('ABS plastic')).toBe('mixed');
      expect(checkOverrides('PETG filament')).toBe('mixed');
    });

    // Critical: Bioplastics → mixed (NOT food)
    it('should return mixed for bioplastics', () => {
      expect(checkOverrides('bioplastic container')).toBe('mixed');
      expect(checkOverrides('compostable plastic bag')).toBe('mixed');
      expect(checkOverrides('biodegradable cutlery')).toBe('mixed');
    });

    // Critical: TetraPak → paper
    it('should return paper for TetraPak', () => {
      expect(checkOverrides('Tetrapak carton')).toBe('paper');
      expect(checkOverrides('tetra pak')).toBe('paper');
      expect(checkOverrides('milk carton')).toBe('paper');
      expect(checkOverrides('juice carton')).toBe('paper');
      expect(checkOverrides('mjólkurfernu')).toBe('paper');
    });

    // Critical: Foam → recycling_center
    it('should return recycling_center for foam/styrofoam', () => {
      expect(checkOverrides('styrofoam box')).toBe('recycling_center');
      expect(checkOverrides('foam')).toBe('recycling_center'); // exact word match
      expect(checkOverrides('polystyrene')).toBe('recycling_center');
      expect(checkOverrides('frauðplast')).toBe('recycling_center');
    });

    // Critical: Greasy cardboard → mixed
    it('should return mixed for dirty/greasy paper', () => {
      expect(checkOverrides('greasy cardboard')).toBe('mixed');
      expect(checkOverrides('pizza box')).toBe('mixed');
      expect(checkOverrides('dirty paper')).toBe('mixed');
    });

    // Deposit items → deposit
    it('should return deposit for skilagjald items', () => {
      expect(checkOverrides('gosdós')).toBe('deposit');
      expect(checkOverrides('bjórdós')).toBe('deposit');
      expect(checkOverrides('Coca-Cola bottle')).toBe('deposit');
      expect(checkOverrides('pepsi can')).toBe('deposit');
      expect(checkOverrides('Red Bull')).toBe('deposit');
      expect(checkOverrides('PET bottle')).toBe('deposit');
    });

    // Large metals → recycling_center
    it('should return recycling_center for large metal items', () => {
      expect(checkOverrides('bronze statue')).toBe('recycling_center');
      expect(checkOverrides('copper wire')).toBe('recycling_center');
      expect(checkOverrides('iron bar')).toBe('recycling_center');
      expect(checkOverrides('metal frame')).toBe('recycling_center');
      expect(checkOverrides('picture frame')).toBe('recycling_center');
    });

    // Null/undefined handling
    it('should return null for null/undefined input', () => {
      expect(checkOverrides(null)).toBeNull();
      expect(checkOverrides(undefined)).toBeNull();
      expect(checkOverrides('')).toBeNull();
    });

    // No override match
    it('should return null when no override matches', () => {
      expect(checkOverrides('regular plastic bottle')).toBeNull(); // 'pla' only matches word boundary
      expect(checkOverrides('newspaper')).toBeNull();
      expect(checkOverrides('apple core')).toBeNull();
      expect(checkOverrides('banana peel')).toBeNull();
      expect(checkOverrides('wooden spoon')).toBeNull();
    });

    // Word boundary matching for short keywords
    it('should use word boundary matching for short keywords', () => {
      // 'pla' should match when it's a word, not inside other words
      expect(checkOverrides('pla filament')).toBe('mixed');
      expect(checkOverrides('made of PLA')).toBe('mixed');
      expect(checkOverrides('plastic bottle')).toBeNull(); // 'pla' inside 'plastic'
      expect(checkOverrides('display')).toBeNull(); // 'pla' inside 'display'

      // 'abs' should match when it's a word
      expect(checkOverrides('abs material')).toBe('mixed');
      expect(checkOverrides('abstract art')).toBeNull(); // 'abs' inside 'abstract'
    });
  });

  describe('mapLabelToBin', () => {
    it('should map HuggingFace labels to correct bins', () => {
      expect(mapLabelToBin('cardboard')).toBe('paper');
      expect(mapLabelToBin('paper')).toBe('paper');
      expect(mapLabelToBin('plastic')).toBe('plastic');
      expect(mapLabelToBin('metal')).toBe('plastic'); // Metal goes with plastic in Iceland
      expect(mapLabelToBin('glass')).toBe('recycling_center');
      expect(mapLabelToBin('trash')).toBe('mixed');
      expect(mapLabelToBin('biological')).toBe('food');
      expect(mapLabelToBin('clothes')).toBe('recycling_center');
      expect(mapLabelToBin('battery')).toBe('recycling_center');
    });

    it('should handle case insensitivity', () => {
      expect(mapLabelToBin('CARDBOARD')).toBe('paper');
      expect(mapLabelToBin('Plastic')).toBe('plastic');
      expect(mapLabelToBin('GLASS')).toBe('recycling_center');
    });

    it('should return mixed for unknown labels', () => {
      expect(mapLabelToBin('unknown')).toBe('mixed');
      expect(mapLabelToBin('random')).toBe('mixed');
      expect(mapLabelToBin('')).toBe('mixed');
    });
  });

  describe('getBinInfoForRegion', () => {
    it('should return correct bin info for default region', () => {
      const paperInfo = getBinInfoForRegion('paper');
      expect(paperInfo.icon).toBe('📄');
      expect(paperInfo.color).toBeDefined();
    });

    it('should return correct bin info for plastic', () => {
      const plasticInfo = getBinInfoForRegion('plastic');
      expect(plasticInfo.icon).toBe('🧴');
    });

    it('should return correct bin info for recycling_center', () => {
      const recyclingInfo = getBinInfoForRegion('recycling_center');
      expect(recyclingInfo.icon).toBe('♻️');
    });

    it('should return correct bin info for deposit', () => {
      const depositInfo = getBinInfoForRegion('deposit');
      expect(depositInfo.icon).toBe('🐷');
    });
  });

  describe('getReasonText', () => {
    it('should return special reason for 3D printed items', () => {
      const reason = getReasonText('3D printed vase', 'mixed', 'test');
      expect(reason).toContain('3D prentað');
      expect(reason).toContain('blandaðan úrgang');
    });

    it('should return special reason for TetraPak', () => {
      const reason = getReasonText('Tetrapak carton', 'paper', 'test');
      expect(reason).toContain('TetraPak');
      expect(reason).toContain('Svíþjóðar');
    });

    it('should return special reason for deposit items', () => {
      const reason = getReasonText('Gosdós', 'deposit', 'test');
      expect(reason).toContain('skilagjald');
      expect(reason).toContain('Endurvinnslan');
    });

    it('should return special reason for large metal items', () => {
      const reason = getReasonText('bronze statue', 'recycling_center', 'test');
      expect(reason).toContain('málmhlutir');
      expect(reason).toContain('endurvinnslustöð');
    });

    it('should return special reason for recycling center items', () => {
      const reason = getReasonText('Glass bottle', 'recycling_center', 'test');
      expect(reason).toContain('endurvinnslustöð');
      expect(reason).toContain('heimatunnur');
    });

    it('should return generic reason for regular items', () => {
      const reason = getReasonText('Dagblað', 'paper', 'test');
      expect(reason).toContain('pappír');
    });
  });

  describe('Constants', () => {
    it('should have all required bin types in BIN_INFO', () => {
      expect(BIN_INFO).toHaveProperty('paper');
      expect(BIN_INFO).toHaveProperty('plastic');
      expect(BIN_INFO).toHaveProperty('food');
      expect(BIN_INFO).toHaveProperty('mixed');
      expect(BIN_INFO).toHaveProperty('recycling_center');
      expect(BIN_INFO).toHaveProperty('deposit');
    });

    it('should have critical overrides defined', () => {
      // PLA must go to mixed
      expect(ICELAND_OVERRIDES['pla']).toBe('mixed');
      // Bioplastic must go to mixed
      expect(ICELAND_OVERRIDES['bioplastic']).toBe('mixed');
      // TetraPak must go to paper
      expect(ICELAND_OVERRIDES['tetrapak']).toBe('paper');
      // Styrofoam must go to recycling_center
      expect(ICELAND_OVERRIDES['styrofoam']).toBe('recycling_center');
    });

    it('should map glass to recycling_center in HF labels', () => {
      expect(HF_LABEL_TO_BIN['glass']).toBe('recycling_center');
      expect(HF_LABEL_TO_BIN['white-glass']).toBe('recycling_center');
      expect(HF_LABEL_TO_BIN['brown-glass']).toBe('recycling_center');
    });
  });
});
