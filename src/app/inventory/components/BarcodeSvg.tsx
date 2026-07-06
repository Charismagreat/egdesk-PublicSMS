import React from 'react';

interface BarcodeSvgProps {
  value: string;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({ value }) => {
  const cleanVal = (value || '880123456789').toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Code 39 이진 맵핑 테이블 (1: 두꺼운 바, 0: 얇은 바)
  const getPattern = (char: string) => {
    const patterns: Record<string, string> = {
      '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
      '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
      '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
      'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
      'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100'
    };
    return patterns[char] || '000110100'; // fallback
  };

  let bits = '10010110'; // Start 캐릭터 '*'
  for (let i = 0; i < Math.min(cleanVal.length, 12); i++) {
    bits += getPattern(cleanVal[i]) + '0'; // 문자간 구분자
  }
  bits += '10010110'; // Stop 캐릭터 '*'

  return (
    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-lg">
      <svg width="100%" height="45" viewBox={`0 0 ${bits.length * 2} 45`} preserveAspectRatio="none" className="w-full">
        <g fill="#000000">
          {bits.split('').map((bit, idx) => {
            if (bit === '1') {
              return <rect key={idx} x={idx * 2} y="0" width="1.8" height="38" fill="#000000" />;
            }
            return null;
          })}
        </g>
      </svg>
      <span className="text-[9px] font-bold text-slate-700 tracking-[0.2em] mt-1 select-all font-mono uppercase">
        {cleanVal || '880123456789'}
      </span>
    </div>
  );
};
