# py/pv_ephemeral_ids/allocator.py

# PORTED BY CHATGPT, NOT TESTED

import random
from typing import Dict, List, Set

from .generator import generate_id_map


class EphemeralIds:
    def __init__(self, id_map: Dict[str, List[str]]):
        self.id_map = id_map
        self.reset()

        if self.num_available == 0:
            raise ValueError("No available identifiers.")

        # All starters should be the same length
        self.starter_length = len(next(iter(self.starters)))

    def reset(self):
        # Full list of available starter tokens
        self.starters: List[str] = list(self.id_map.keys())
        self.num_available = len(self.starters)
        self.active_ids: Set[str] = set()

    def create(self) -> str:
        """Allocates a new ephemeral identifier."""
        if self.num_available == 0:
            raise RuntimeError("No available identifiers.")

        # Randomly pick a starter
        index = random.randint(0, self.num_available - 1)
        starter = self.starters[index]
        suffixes = self.id_map[starter]
        suffix = random.choice(suffixes)
        eid = f"{starter}{suffix}"

        # Swap out the starter to mark it as used
        self.starters[index] = self.starters[self.num_available - 1]
        self.num_available -= 1

        self.active_ids.add(eid)
        return eid

    def release(self, eid: str):
        """Releases a previously allocated identifier."""
        if eid not in self.active_ids:
            return  # silent skip
        self.active_ids.remove(eid)

        starter = eid[:self.starter_length]
        if self.num_available < len(self.starters):
            self.starters[self.num_available] = starter
        else:
            self.starters.append(starter)
        self.num_available += 1

    @classmethod
    async def from_repo(cls, model_repo: str, prefix: str = "", long: bool = False, cache: bool = True):
        id_map = generate_id_map(model_repo, prefix=prefix, long=long, cache=cache)
        return cls(id_map)

# end of file
