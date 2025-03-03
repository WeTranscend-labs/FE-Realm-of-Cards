'use client';

import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { contractABI } from '../contracts/contractABI';
import {
  Card,
  OnAttackEffect,
  OnDeadEffect,
  OnDefenseEffect,
  ActiveSkill,
  Class,
} from '@/types/game';
import { Address } from 'viem';

// Kiểm tra dữ liệu hợp lệ từ contract
function isValidPaginatedCards(data: unknown): data is {
  cardsPage: { id: bigint; card: any }[];
  totalPages: bigint;
  totalElements: bigint;
} {
  return (
    data !== null &&
    typeof data === 'object' &&
    'cardsPage' in data &&
    'totalPages' in data &&
    'totalElements' in data &&
    Array.isArray((data as any).cardsPage) &&
    ((data as any).cardsPage as any[]).every(
      (item) =>
        typeof item === 'object' &&
        'id' in item &&
        'card' in item &&
        typeof item.card === 'object' &&
        'name' in item.card &&
        'attack' in item.card &&
        'health' in item.card &&
        'maxPerSession' in item.card &&
        'staminaCost' in item.card &&
        'image' in item.card &&
        'onAttackEffect' in item.card &&
        'onDeadEffect' in item.card &&
        'onDefenseEffect' in item.card &&
        'activeSkill' in item.card &&
        'classes' in item.card &&
        Array.isArray(item.card.classes)
    )
  );
}

// Hàm ánh xạ số sang Class
const mapClassFromNumber = (classNumber: number): Class => {
  const classMap: { [key: number]: Class } = {
    0: Class.METAL,
    1: Class.WOOD,
    2: Class.WATER,
    3: Class.FIRE,
    4: Class.EARTH,
  };
  return classMap[classNumber] || Class.METAL; // Default nếu không khớp
};

export function useGetCards(
  initialPageIndex = BigInt(0),
  initialPageSize = BigInt(40)
) {
  const [pageIndex, setPageIndex] = useState<bigint>(initialPageIndex);
  const [pageSize, setPageSize] = useState<bigint>(initialPageSize);

  const {
    data: contractData,
    error,
    isLoading,
    refetch,
  } = useReadContract({
    address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as Address,
    abi: contractABI,
    functionName: 'getCardsPaginated',
    args: [pageIndex, pageSize], // Dùng state để linh hoạt
    query: {
      enabled: pageSize > 0,
      staleTime: 1000 * 60 * 5, // 5 phút
    },
  });

  const processedCards: Card[] | undefined = (() => {
    if (!contractData) return undefined;

    if (!isValidPaginatedCards(contractData)) {
      console.error('Invalid contract data', contractData);
      return undefined;
    }

    // Gộp id từ CardWithId vào Card và trả về mảng Card[]
    return contractData.cardsPage.map((item) => ({
      id: Number(item.id), // Lấy id từ CardWithId thay vì card.id
      name: item.card.name,
      attack: Number(item.card.attack),
      health: Number(item.card.health),
      maxPerSession: Number(item.card.maxPerSession),
      staminaCost: Number(item.card.staminaCost),
      image: item.card.image,
      onAttackEffect:
        OnAttackEffect[
          OnAttackEffect[
            item.card.onAttackEffect as keyof typeof OnAttackEffect
          ]
        ],
      onDeadEffect:
        OnDeadEffect[
          OnDeadEffect[item.card.onDeadEffect as keyof typeof OnDeadEffect]
        ],
      onDefenseEffect:
        OnDefenseEffect[
          OnDefenseEffect[
            item.card.onDefenseEffect as keyof typeof OnDefenseEffect
          ]
        ],
      activeSkill:
        ActiveSkill[
          ActiveSkill[item.card.activeSkill as keyof typeof ActiveSkill]
        ],
      class: item.card.classes.map((c: number) => mapClassFromNumber(c)),
    }));
  })();

  const fetchCardsByPage = (newPageIndex: bigint, newPageSize?: bigint) => {
    setPageIndex(newPageIndex);
    if (newPageSize) setPageSize(newPageSize);
    refetch();
  };

  return {
    cards: processedCards,
    error,
    isLoading,
    pageIndex,
    pageSize,
    fetchCardsByPage,
    refetch,
  };
}
