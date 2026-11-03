package TIS.EMS.dto;

import TIS.EMS.models.LookupItem;

/** An {id, name} pair for a referenced lookup row. */
public record Ref(Long id, String name) {
    public static Ref from(LookupItem item) {
        return item == null ? null : new Ref(item.getId(), item.getName());
    }
}
