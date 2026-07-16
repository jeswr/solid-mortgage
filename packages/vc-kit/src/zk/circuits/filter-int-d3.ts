/**
 * PROVENANCE (do not edit by hand): the sparq `zk/compose/filter_int_d3` circuit
 * member, compiled from the sparq read-only checkout at commit
 * 947480b02fcbd174f80f9247b55ee02202d2e345 with the PINNED toolchain
 * `nargo 1.0.0-beta.21` (noirc 1.0.0-beta.21+89a0f0faf3a5f1273c8ac4843b7877882437e277):
 *
 *   nargo compile --package filter_int_d3
 *
 * over an unmodified copy of `zk/compose/{compose_core,filter_int_d3}`.
 * Reproducibility check at capture time: recompiling `filter_int_d2` this way
 * produced a `bytecode` byte-identical to the artifact the sparq site ships at
 * `site/public/zk/filter_int_d2.json` (the car-hire age-gate circuit).
 *
 * Relation (sparq_zk_compose_core::filter_int): public
 * (challenge, operand_enc, op, bound, expected), private digits[3]. The
 * circuit rebuilds the canonical `"<digits>"^^xsd:integer` N-Triples token
 * in-circuit and asserts `h2(LITERAL, blake3(token)) == operand_enc` plus the
 * comparison verdict - a false verdict is UNSATISFIABLE. Re-capture this file
 * (and re-run the suite) on ANY nargo/noir_js/bb.js version bump.
 */
export const FilterIntD3 = {
  noir_version: "1.0.0-beta.21+89a0f0faf3a5f1273c8ac4843b7877882437e277",
  hash: "7277909748492435361",
  abi: {
    parameters: [
      {
        name: "challenge",
        type: {
          kind: "field",
        },
        visibility: "public",
      },
      {
        name: "operand_enc",
        type: {
          kind: "field",
        },
        visibility: "public",
      },
      {
        name: "op",
        type: {
          kind: "integer",
          sign: "unsigned",
          width: 32,
        },
        visibility: "public",
      },
      {
        name: "bound",
        type: {
          kind: "integer",
          sign: "unsigned",
          width: 64,
        },
        visibility: "public",
      },
      {
        name: "expected",
        type: {
          kind: "boolean",
        },
        visibility: "public",
      },
      {
        name: "digits",
        type: {
          kind: "array",
          length: 3,
          type: {
            kind: "integer",
            sign: "unsigned",
            width: 8,
          },
        },
        visibility: "private",
      },
    ],
    return_type: null,
    error_types: {
      "361444214588792908": {
        error_kind: "string",
        string: "attempt to multiply with overflow",
      },
      "1998584279744703196": {
        error_kind: "string",
        string: "attempt to subtract with overflow",
      },
      "2689072257712248003": {
        error_kind: "string",
        string: "unknown comparison operator",
      },
      "4329465905395055483": {
        error_kind: "string",
        string: "non-canonical leading zero",
      },
      "4760072273269455007": {
        error_kind: "string",
        string: "not a decimal digit",
      },
      "14443795209635990948": {
        error_kind: "string",
        string: "operand encoding mismatch",
      },
      "14990209321349310352": {
        error_kind: "string",
        string: "attempt to add with overflow",
      },
      "16338432561539845416": {
        error_kind: "string",
        string: "filter verdict mismatch",
      },
    },
  },
  bytecode:
    "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",
  debug_symbols:
    "pZfbbqMwEED/hec8eC6+9VdWq4qmtEJCJKJJpVXUf98xHgxZiajrvuQkYJ+Mx2Njbs1r93J9f+7Ht9NH8/Tr1rxM/TD078/D6dhe+tMoV29fh2b5+XyZuk4uNZv70uvcTt14aZ7G6zAcms92uM6NPs7tOPPSTnLXHJpufBWK8K0fuvTt67D2NvtdAaPV3kA2FAHHOwPsG9DG5f/RGSgGC983BCoGohqDtyUGb+NPDc5WGfxqCHUGxsUQwNQYQiyZjOwqDGTcMgoynqsMNhZDwCoD22Kw9qeGUFNRZGnJJFmOVYboFoPD/dnkB4vT0pJKsHadDPDfDiKUspavVcPYGlyoMlAohrqi3Bpc3SgiLIYIuzHgo53S+CUIALNZGXyveBQFl5oKayb9/WaN+EDgeK2pTUH8lwJgLUuqUsRUtJrMzdr4V2H3FQxls2Q0fq+yH0fh1yn1u1E8LIqwGqoWBwMsC5SBsMrAvhgcVBnK05Mh1uzYjIhlMqqev4zMxWCrRoHOFYP3VYYQiiFWGQhKHgir8kB2Nbgqg9TRYmB3P4rf8qs99tPdGbJxskwOjZ8/w/wZpZ4PDRjpJYAMzKDmSfIMnGEzRCFFCD4j5JZxBmYLwtwSMSNbkOcOaDNcbukzsgXj3JJMRrYQzh2IMsQiE0c2QyyypMhnhIw4g006rwpBiWkrFpKSczOb4bSVV4b0FBXGdMw8NNYoQYlKUnI6TwltOkwJndIrgzKlWzYzZ5SgRKX4SKJzrLRK8ZHE5bwyKJNPVpM3SlCiMvkkPs9Kq3TK5JO8+qCMmcEoNb6g8QVScvYHq0w+yVfwyqBMPqmvaJSgxJyPSMrkS0+5z3bq25eh0zeet+t43LwAXf6clzvLK9J5Oh271+vUpUKf70np/wU=",
  file_map: {
    "17": {
      source:
        '// Exposed only for usage in `std::meta`\npub(crate) mod poseidon2;\n\nuse crate::default::Default;\nuse crate::embedded_curve_ops::{\n    EmbeddedCurvePoint, EmbeddedCurveScalar, multi_scalar_mul, multi_scalar_mul_array_return,\n};\nuse crate::meta::derive_via;\nuse crate::static_assert;\n\n/// The size of the state accepted by the backend in `poseidon2_permutation`.\nglobal POSEIDON2_CONFIG_STATE_SIZE: u32 = poseidon2_config_state_size();\n\n#[foreign(sha256_compression)]\n// docs:start:sha256_compression\npub fn sha256_compression(input: [u32; 16], state: [u32; 8]) -> [u32; 8] {}\n// docs:end:sha256_compression\n\n#[foreign(keccakf1600)]\n// docs:start:keccakf1600\npub fn keccakf1600(input: [u64; 25]) -> [u64; 25] {}\n// docs:end:keccakf1600\n\npub mod keccak {\n    #[deprecated("This function has been moved to std::hash::keccakf1600")]\n    pub fn keccakf1600(input: [u64; 25]) -> [u64; 25] {\n        super::keccakf1600(input)\n    }\n}\n\n#[foreign(blake2s)]\n// docs:start:blake2s\npub fn blake2s<let N: u32>(input: [u8; N]) -> [u8; 32]\n// docs:end:blake2s\n{}\n\n// docs:start:blake3\npub fn blake3<let N: u32>(input: [u8; N]) -> [u8; 32]\n// docs:end:blake3\n{\n    if crate::runtime::is_unconstrained() {\n        // Temporary measure while Barretenberg is main proving system.\n        // Please open an issue if you\'re working on another proving system and running into problems due to this.\n        crate::static_assert(\n            N <= 1024,\n            "Barretenberg cannot prove blake3 hashes with inputs larger than 1024 bytes",\n        );\n    }\n    __blake3(input)\n}\n\n#[foreign(blake3)]\nfn __blake3<let N: u32>(input: [u8; N]) -> [u8; 32] {}\n\n// docs:start:pedersen_commitment\npub fn pedersen_commitment<let N: u32>(input: [Field; N]) -> EmbeddedCurvePoint {\n    // docs:end:pedersen_commitment\n    pedersen_commitment_with_separator(input, 0)\n}\n\n#[inline_always]\npub fn pedersen_commitment_with_separator<let N: u32>(\n    input: [Field; N],\n    separator: u32,\n) -> EmbeddedCurvePoint {\n    let mut points = [EmbeddedCurveScalar { lo: 0, hi: 0 }; N];\n    for i in 0..N {\n        points[i] = EmbeddedCurveScalar::from_field(input[i]);\n    }\n    let generators = derive_generators("DEFAULT_DOMAIN_SEPARATOR".as_bytes(), separator);\n    multi_scalar_mul(generators, points)\n}\n\n// docs:start:pedersen_hash\npub fn pedersen_hash<let N: u32>(input: [Field; N]) -> Field\n// docs:end:pedersen_hash\n{\n    pedersen_hash_with_separator(input, 0)\n}\n\n#[no_predicates]\npub fn pedersen_hash_with_separator<let N: u32>(input: [Field; N], separator: u32) -> Field {\n    let mut scalars: [EmbeddedCurveScalar; N + 1] = [EmbeddedCurveScalar { lo: 0, hi: 0 }; N + 1];\n    let mut generators: [EmbeddedCurvePoint; N + 1] =\n        [EmbeddedCurvePoint::point_at_infinity(); N + 1];\n    crate::assert_constant(separator);\n    let domain_generators: [EmbeddedCurvePoint; N] =\n        derive_generators("DEFAULT_DOMAIN_SEPARATOR".as_bytes(), separator);\n\n    for i in 0..N {\n        scalars[i] = EmbeddedCurveScalar::from_field(input[i]);\n        generators[i] = domain_generators[i];\n    }\n    scalars[N] = EmbeddedCurveScalar { lo: N as Field, hi: 0 as Field };\n\n    let length_generator: [EmbeddedCurvePoint; 1] =\n        derive_generators("pedersen_hash_length".as_bytes(), 0);\n    generators[N] = length_generator[0];\n    multi_scalar_mul_array_return(generators, scalars, true)[0].x\n}\n\n#[field(bn254)]\n#[inline_always]\npub fn derive_generators<let N: u32, let M: u32>(\n    domain_separator_bytes: [u8; M],\n    starting_index: u32,\n) -> [EmbeddedCurvePoint; N] {\n    crate::assert_constant(domain_separator_bytes);\n    crate::assert_constant(starting_index);\n    __derive_generators(domain_separator_bytes, starting_index)\n}\n\n#[builtin(derive_pedersen_generators)]\n#[field(bn254)]\nfn __derive_generators<let N: u32, let M: u32>(\n    domain_separator_bytes: [u8; M],\n    starting_index: u32,\n) -> [EmbeddedCurvePoint; N] {}\n\npub fn poseidon2_permutation<let N: u32>(input: [Field; N]) -> [Field; N] {\n    static_assert(\n        N == POSEIDON2_CONFIG_STATE_SIZE,\n        f"the input length must equal the state size in the Poseidon2 config; expected {POSEIDON2_CONFIG_STATE_SIZE}, got {N}",\n    );\n    poseidon2_permutation_internal(input)\n}\n\n#[foreign(poseidon2_permutation)]\nfn poseidon2_permutation_internal<let N: u32>(input: [Field; N]) -> [Field; N] {}\n\n#[foreign(poseidon2_config_state_size)]\ncomptime fn poseidon2_config_state_size() -> u32 {}\n\n// Generic hashing support.\n// Partially ported and impacted by rust.\n\n// Hash trait shall be implemented per type.\n#[derive_via(derive_hash)]\npub trait Hash {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher;\n}\n\n// docs:start:derive_hash\ncomptime fn derive_hash(s: TypeDefinition) -> Quoted {\n    let name = quote { $crate::hash::Hash };\n    let signature = quote { fn hash<H>(_self: Self, _state: &mut H) where H: $crate::hash::Hasher };\n    let for_each_field = |name| quote { _self.$name.hash(_state); };\n    crate::meta::make_trait_impl(\n        s,\n        name,\n        signature,\n        for_each_field,\n        quote {},\n        |fields| fields,\n    )\n}\n// docs:end:derive_hash\n\n// Hasher trait shall be implemented by algorithms to provide hash-agnostic means.\n// TODO: consider making the types generic here ([u8], [Field], etc.)\npub trait Hasher {\n    fn finish(self) -> Field;\n\n    /// Returns the hash value without consuming the hasher.\n    /// Override this for more efficient implementations that avoid copying.\n    /// TODO: deprecate finish() and replace it\n    fn finish_ref(&self) -> Field {\n        (*self).finish()\n    }\n\n    fn write(&mut self, input: Field);\n}\n\n// BuildHasher is a factory trait, responsible for production of specific Hasher.\npub trait BuildHasher {\n    type H: Hasher;\n\n    fn build_hasher(self) -> H;\n}\n\npub struct BuildHasherDefault<H>;\n\nimpl<H> BuildHasher for BuildHasherDefault<H>\nwhere\n    H: Hasher + Default,\n{\n    type H = H;\n\n    fn build_hasher(_self: Self) -> H {\n        H::default()\n    }\n}\n\nimpl<H> Default for BuildHasherDefault<H>\nwhere\n    H: Hasher + Default,\n{\n    fn default() -> Self {\n        BuildHasherDefault {}\n    }\n}\n\nimpl Hash for Field {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        H::write(state, self);\n    }\n}\n\nimpl Hash for u8 {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        H::write(state, self as Field);\n    }\n}\n\nimpl Hash for u16 {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        H::write(state, self as Field);\n    }\n}\n\nimpl Hash for u32 {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        H::write(state, self as Field);\n    }\n}\n\nimpl Hash for u64 {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        H::write(state, self as Field);\n    }\n}\n\nimpl Hash for u128 {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        H::write(state, self as Field);\n    }\n}\n\nimpl Hash for i8 {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        H::write(state, self as u8 as Field);\n    }\n}\n\nimpl Hash for i16 {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        H::write(state, self as u16 as Field);\n    }\n}\n\nimpl Hash for i32 {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        H::write(state, self as u32 as Field);\n    }\n}\n\nimpl Hash for i64 {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        H::write(state, self as u64 as Field);\n    }\n}\n\nimpl Hash for bool {\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        H::write(state, self as Field);\n    }\n}\n\nimpl Hash for () {\n    fn hash<H>(_self: Self, _state: &mut H)\n    where\n        H: Hasher,\n    {}\n}\n\nimpl<T, let N: u32> Hash for [T; N]\nwhere\n    T: Hash,\n{\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        for elem in self {\n            elem.hash(state);\n        }\n    }\n}\n\nimpl<T> Hash for [T]\nwhere\n    T: Hash,\n{\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        self.len().hash(state);\n        for elem in self {\n            elem.hash(state);\n        }\n    }\n}\n\nimpl<A, B> Hash for (A, B)\nwhere\n    A: Hash,\n    B: Hash,\n{\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        self.0.hash(state);\n        self.1.hash(state);\n    }\n}\n\nimpl<A, B, C> Hash for (A, B, C)\nwhere\n    A: Hash,\n    B: Hash,\n    C: Hash,\n{\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        self.0.hash(state);\n        self.1.hash(state);\n        self.2.hash(state);\n    }\n}\n\nimpl<A, B, C, D> Hash for (A, B, C, D)\nwhere\n    A: Hash,\n    B: Hash,\n    C: Hash,\n    D: Hash,\n{\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        self.0.hash(state);\n        self.1.hash(state);\n        self.2.hash(state);\n        self.3.hash(state);\n    }\n}\n\nimpl<A, B, C, D, E> Hash for (A, B, C, D, E)\nwhere\n    A: Hash,\n    B: Hash,\n    C: Hash,\n    D: Hash,\n    E: Hash,\n{\n    fn hash<H>(self, state: &mut H)\n    where\n        H: Hasher,\n    {\n        self.0.hash(state);\n        self.1.hash(state);\n        self.2.hash(state);\n        self.3.hash(state);\n        self.4.hash(state);\n    }\n}\n\n// Some test vectors for Pedersen hash and Pedersen Commitment.\n// They have been generated using the same functions so the tests are for now useless\n// but they will be useful when we switch to Noir implementation.\n#[test]\nfn assert_pedersen() {\n    assert_eq(\n        pedersen_hash_with_separator([1], 1),\n        0x1b3f4b1a83092a13d8d1a59f7acb62aba15e7002f4440f2275edb99ebbc2305f,\n    );\n    assert_eq(\n        pedersen_commitment_with_separator([1], 1),\n        EmbeddedCurvePoint {\n            x: 0x054aa86a73cb8a34525e5bbed6e43ba1198e860f5f3950268f71df4591bde402,\n            y: 0x209dcfbf2cfb57f9f6046f44d71ac6faf87254afc7407c04eb621a6287cac126,\n        },\n    );\n\n    assert_eq(\n        pedersen_hash_with_separator([1, 2], 2),\n        0x26691c129448e9ace0c66d11f0a16d9014a9e8498ee78f4d69f0083168188255,\n    );\n    assert_eq(\n        pedersen_commitment_with_separator([1, 2], 2),\n        EmbeddedCurvePoint {\n            x: 0x2e2b3b191e49541fe468ec6877721d445dcaffe41728df0a0eafeb15e87b0753,\n            y: 0x2ff4482400ad3a6228be17a2af33e2bcdf41be04795f9782bd96efe7e24f8778,\n        },\n    );\n    assert_eq(\n        pedersen_hash_with_separator([1, 2, 3], 3),\n        0x0bc694b7a1f8d10d2d8987d07433f26bd616a2d351bc79a3c540d85b6206dbe4,\n    );\n    assert_eq(\n        pedersen_commitment_with_separator([1, 2, 3], 3),\n        EmbeddedCurvePoint {\n            x: 0x1fee4e8cf8d2f527caa2684236b07c4b1bad7342c01b0f75e9a877a71827dc85,\n            y: 0x2f9fedb9a090697ab69bf04c8bc15f7385b3e4b68c849c1536e5ae15ff138fd1,\n        },\n    );\n    assert_eq(\n        pedersen_hash_with_separator([1, 2, 3, 4], 4),\n        0xdae10fb32a8408521803905981a2b300d6a35e40e798743e9322b223a5eddc,\n    );\n    assert_eq(\n        pedersen_commitment_with_separator([1, 2, 3, 4], 4),\n        EmbeddedCurvePoint {\n            x: 0x07ae3e202811e1fca39c2d81eabe6f79183978e6f12be0d3b8eda095b79bdbc9,\n            y: 0x0afc6f892593db6fbba60f2da558517e279e0ae04f95758587760ba193145014,\n        },\n    );\n    assert_eq(\n        pedersen_hash_with_separator([1, 2, 3, 4, 5], 5),\n        0xfc375b062c4f4f0150f7100dfb8d9b72a6d28582dd9512390b0497cdad9c22,\n    );\n    assert_eq(\n        pedersen_commitment_with_separator([1, 2, 3, 4, 5], 5),\n        EmbeddedCurvePoint {\n            x: 0x1754b12bd475a6984a1094b5109eeca9838f4f81ac89c5f0a41dbce53189bb29,\n            y: 0x2da030e3cfcdc7ddad80eaf2599df6692cae0717d4e9f7bfbee8d073d5d278f7,\n        },\n    );\n    assert_eq(\n        pedersen_hash_with_separator([1, 2, 3, 4, 5, 6], 6),\n        0x1696ed13dc2730062a98ac9d8f9de0661bb98829c7582f699d0273b18c86a572,\n    );\n    assert_eq(\n        pedersen_commitment_with_separator([1, 2, 3, 4, 5, 6], 6),\n        EmbeddedCurvePoint {\n            x: 0x190f6c0e97ad83e1e28da22a98aae156da083c5a4100e929b77e750d3106a697,\n            y: 0x1f4b60f34ef91221a0b49756fa0705da93311a61af73d37a0c458877706616fb,\n        },\n    );\n    assert_eq(\n        pedersen_hash_with_separator([1, 2, 3, 4, 5, 6, 7], 7),\n        0x128c0ff144fc66b6cb60eeac8a38e23da52992fc427b92397a7dffd71c45ede3,\n    );\n    assert_eq(\n        pedersen_commitment_with_separator([1, 2, 3, 4, 5, 6, 7], 7),\n        EmbeddedCurvePoint {\n            x: 0x015441e9d29491b06563fac16fc76abf7a9534c715421d0de85d20dbe2965939,\n            y: 0x1d2575b0276f4e9087e6e07c2cb75aa1baafad127af4be5918ef8a2ef2fea8fc,\n        },\n    );\n    assert_eq(\n        pedersen_hash_with_separator([1, 2, 3, 4, 5, 6, 7, 8], 8),\n        0x2f960e117482044dfc99d12fece2ef6862fba9242be4846c7c9a3e854325a55c,\n    );\n    assert_eq(\n        pedersen_commitment_with_separator([1, 2, 3, 4, 5, 6, 7, 8], 8),\n        EmbeddedCurvePoint {\n            x: 0x1657737676968887fceb6dd516382ea13b3a2c557f509811cd86d5d1199bc443,\n            y: 0x1f39f0cb569040105fa1e2f156521e8b8e08261e635a2b210bdc94e8d6d65f77,\n        },\n    );\n    assert_eq(\n        pedersen_hash_with_separator([1, 2, 3, 4, 5, 6, 7, 8, 9], 9),\n        0x0c96db0790602dcb166cc4699e2d306c479a76926b81c2cb2aaa92d249ec7be7,\n    );\n    assert_eq(\n        pedersen_commitment_with_separator([1, 2, 3, 4, 5, 6, 7, 8, 9], 9),\n        EmbeddedCurvePoint {\n            x: 0x0a3ceae42d14914a432aa60ec7fded4af7dad7dd4acdbf2908452675ec67e06d,\n            y: 0xfc19761eaaf621ad4aec9a8b2e84a4eceffdba78f60f8b9391b0bd9345a2f2,\n        },\n    );\n    assert_eq(\n        pedersen_hash_with_separator([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10),\n        0x2cd37505871bc460a62ea1e63c7fe51149df5d0801302cf1cbc48beb8dff7e94,\n    );\n    assert_eq(\n        pedersen_commitment_with_separator([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10),\n        EmbeddedCurvePoint {\n            x: 0x2fb3f8b3d41ddde007c8c3c62550f9a9380ee546fcc639ffbb3fd30c8d8de30c,\n            y: 0x300783be23c446b11a4c0fabf6c91af148937cea15fcf5fb054abf7f752ee245,\n        },\n    );\n}\n',
      path: "std/hash/mod.nr",
      function_locations: [
        {
          start: 572,
          name: "sha256_compression",
        },
        {
          start: 707,
          name: "keccakf1600",
        },
        {
          start: 882,
          name: "keccak::keccakf1600",
        },
        {
          start: 1044,
          name: "blake2s",
        },
        {
          start: 1142,
          name: "blake3",
        },
        {
          start: 1629,
          name: "__blake3",
        },
        {
          start: 1747,
          name: "pedersen_commitment",
        },
        {
          start: 1976,
          name: "pedersen_commitment_with_separator",
        },
        {
          start: 2380,
          name: "pedersen_hash",
        },
        {
          start: 2537,
          name: "pedersen_hash_with_separator",
        },
        {
          start: 3531,
          name: "derive_generators",
        },
        {
          start: 3890,
          name: "__derive_generators",
        },
        {
          start: 3968,
          name: "poseidon2_permutation",
        },
        {
          start: 4324,
          name: "poseidon2_permutation_internal",
        },
        {
          start: 4417,
          name: "poseidon2_config_state_size",
        },
        {
          start: 4728,
          name: "derive_hash",
        },
        {
          start: 5953,
          name: "<impl BuildHasher for BuildHasherDefault<H>>::build_hasher",
        },
        {
          start: 6085,
          name: "<impl Default for BuildHasherDefault<H>>::default",
        },
        {
          start: 6217,
          name: "<impl Hash for Field>::hash",
        },
        {
          start: 6347,
          name: "<impl Hash for u8>::hash",
        },
        {
          start: 6487,
          name: "<impl Hash for u16>::hash",
        },
        {
          start: 6627,
          name: "<impl Hash for u32>::hash",
        },
        {
          start: 6767,
          name: "<impl Hash for u64>::hash",
        },
        {
          start: 6908,
          name: "<impl Hash for u128>::hash",
        },
        {
          start: 7047,
          name: "<impl Hash for i8>::hash",
        },
        {
          start: 7193,
          name: "<impl Hash for i16>::hash",
        },
        {
          start: 7340,
          name: "<impl Hash for i32>::hash",
        },
        {
          start: 7487,
          name: "<impl Hash for i64>::hash",
        },
        {
          start: 7635,
          name: "<impl Hash for bool>::hash",
        },
        {
          start: 7782,
          name: "<impl Hash for ()>::hash",
        },
        {
          start: 7914,
          name: "<impl Hash for [T; N]>::hash",
        },
        {
          start: 8103,
          name: "<impl Hash for [T]>::hash",
        },
        {
          start: 8343,
          name: "<impl Hash for (A, B)>::hash",
        },
        {
          start: 8559,
          name: "<impl Hash for (A, B, C)>::hash",
        },
        {
          start: 8822,
          name: "<impl Hash for (A, B, C, D)>::hash",
        },
        {
          start: 9132,
          name: "<impl Hash for (A, B, C, D, E)>::hash",
        },
        {
          start: 9528,
          name: "assert_pedersen",
        },
      ],
    },
    "49": {
      source:
        "// Circuit-family member: hidden xsd:integer FILTER operand with D=3 decimal\n// digits (the digit count is a family parameter because the blake3 blackbox\n// needs a comptime token length; choosing this member leaks ceil(log10(v))\n// of the hidden operand -- documented envelope leak). Relation:\n// sparq_zk_compose_core::filter_int.\n//\n// [OPUS-4.8] sq-wto: fills the 3-digit gap in the compiled {1,2,4} family. The\n// derivation now requires an EXACT digit-count match (a 3-digit operand used to\n// derive d=4, whose `digits: [u8; 4]` witness no 3-digit value can satisfy --\n// a silently-unprovable FILTER). With this member 1..=4 digit operands all have\n// a provable circuit; out-of-family counts (5..=19, >19) return None cleanly.\nuse sparq_zk_compose_core::filter_int::filter_int_check;\n\nfn main(\n    // -- public --\n    challenge: pub Field,   // verifier nonce (replay binding S2.5)\n    operand_enc: pub Field, // the hidden column's term encoding (scan-proof anchor)\n    op: pub u32,            // 0=lt 1=le 2=gt 3=ge 4=eq 5=ne\n    bound: pub u64,         // the FILTER's constant operand\n    expected: pub bool,     // the disclosed verdict for this operand\n    // -- private --\n    digits: [u8; 3],       // canonical decimal digits of the hidden value\n) {\n    let _ = challenge;\n    filter_int_check::<3>(operand_enc, op, bound, expected, digits);\n}\n",
      path: "/private/tmp/claude-502/-Users-jesght-Documents-GitHub-jeswr-solid-mortgage/95574b57-dc0f-49f0-96e6-da23ea936933/scratchpad/zkbuild/filter_int_d3/src/main.nr",
      function_locations: [
        {
          start: 1266,
          name: "main",
        },
      ],
    },
    "51": {
      source:
        '//! Hidden-operand numeric FILTER over committed `xsd:integer` literals.\n//!\n//! The encoding gap this circuit closes: `sparq_zk::encode` commits a\n//! literal as `Enc = h2(TYPE_CODE_LITERAL, h_s(token))` with\n//! `h_s = blake3` over the canonical N-Triples token -- a STRING hash, so a\n//! committed numeric value has no field-arithmetic binding. To prove a\n//! predicate about the hidden value we re-derive the binding in-circuit for\n//! exactly one short token: witness the digit bytes, rebuild the canonical\n//! token `"<digits>"^^<http://www.w3.org/2001/XMLSchema#integer>`, hash it\n//! with the `blake3` BLACKBOX (~one compression for tokens <= 64 bytes -- a\n//! measured, deliberate exception to the "never hash strings in-circuit"\n//! house rule, ~3 orders below the standard-cryptosuite cliff of plan S2.3),\n//! truncate the digest to the low 31 bytes big-endian (mirroring\n//! `sparq_zk::field::field_from_hash_bytes`), and assert\n//! `h2(2, digest_field) == operand_enc`.\n//!\n//! `operand_enc` is PUBLIC: it is the hidden column\'s disclosed term\n//! encoding in the manifest\'s binding table, which the scan proof binds to a\n//! committed triple slot. Composition: scan proof ties `operand_enc` to the\n//! commitment; this proof ties `operand_enc` to the numeric value and the\n//! verdict. The verifier checks the same `operand_enc` appears in both\n//! public-input vectors (the `binding_consistency` edge of the modular\n//! architecture, realised as a plain public-input equality).\n//!\n//! The digit count `D` is a circuit-family parameter (blake3\'s blackbox\n//! needs a comptime byte length). The verifier accepts any `D` member -- the\n//! token binding makes a wrong-D proof unsatisfiable -- at the documented\n//! cost of leaking ceil(log10(value)) of the hidden operand.\n//!\n//! v1 limits: canonical non-negative `xsd:integer` only (no sign, no leading\n//! zeros, D <= 19 so the value fits u64). Negative integers and\n//! xsd:decimal/double operands are deferred (README).\n\nuse crate::hashes::{h2, TYPE_CODE_LITERAL};\n\n/// Comparison operator selector (public input).\npub global OP_LT: u32 = 0;\npub global OP_LE: u32 = 1;\npub global OP_GT: u32 = 2;\npub global OP_GE: u32 = 3;\npub global OP_EQ: u32 = 4;\npub global OP_NE: u32 = 5;\n\n/// The generic relation; each `filter_int_d{D}` bin package is one\n/// monomorphisation.\npub fn filter_int_check<let D: u32>(\n    operand_enc: Field,\n    op: u32,\n    bound: u64,\n    expected: bool,\n    digits: [u8; D],\n) {\n    std::static_assert(D >= 1, "at least one digit");\n    std::static_assert(D <= 19, "value must fit u64");\n    assert(op <= OP_NE, "unknown comparison operator");\n\n    // Canonical digit string: ASCII digits, no leading zero (unless D == 1).\n    for i in 0..D {\n        assert((digits[i] >= 48) & (digits[i] <= 57), "not a decimal digit");\n    }\n    if D > 1 {\n        // comptime condition -- folded per member.\n        assert(digits[0] != 48, "non-canonical leading zero");\n    }\n\n    // The numeric value.\n    let mut value: u64 = 0;\n    for i in 0..D {\n        value = value * 10 + ((digits[i] - 48) as u64);\n    }\n\n    // Rebuild the canonical N-Triples token and re-derive the encoding.\n    // Token layout: \'"\' + digits + \'"\' + "^^<http://www.w3.org/2001/XMLSchema#integer>".\n    let suffix: [u8; 44] = "^^<http://www.w3.org/2001/XMLSchema#integer>".as_bytes();\n    let mut token: [u8; D + 46] = [0; D + 46];\n    token[0] = 34; // \'"\'\n    for i in 0..D {\n        token[i + 1] = digits[i];\n    }\n    token[D + 1] = 34; // \'"\'\n    for i in 0..44 {\n        token[D + 2 + i] = suffix[i];\n    }\n    let digest: [u8; 32] = std::hash::blake3(token);\n\n    // sparq_zk::field::field_from_hash_bytes: big-endian over the low 31\n    // bytes (digest[1..32]) -- truncation, not reduction (248 bits < modulus).\n    let mut hs: Field = 0;\n    for i in 1..32 {\n        hs = hs * 256 + (digest[i] as Field);\n    }\n    assert_eq(h2(TYPE_CODE_LITERAL, hs), operand_enc, "operand encoding mismatch");\n\n    // The comparison verdict. All comparisons are evaluated unconditionally\n    // (flatten_cfg pays both arms anyway; noir-optimisation S13).\n    let lt = value < bound;\n    let eq = value == bound;\n    let result = if op == OP_LT {\n        lt\n    } else if op == OP_LE {\n        lt | eq\n    } else if op == OP_GT {\n        !lt & !eq\n    } else if op == OP_GE {\n        !lt\n    } else if op == OP_EQ {\n        eq\n    } else {\n        !eq\n    };\n    assert_eq(result, expected, "filter verdict mismatch");\n}\n',
      path: "/private/tmp/claude-502/-Users-jesght-Documents-GitHub-jeswr-solid-mortgage/95574b57-dc0f-49f0-96e6-da23ea936933/scratchpad/zkbuild/compose_core/src/filter_int.nr",
      function_locations: [
        {
          start: 2468,
          name: "filter_int_check",
        },
      ],
    },
    "54": {
      source:
        "//! The commitment scheme's hash layer -- MUST stay bit-compatible with\n//! `crates/sparq-zk` (`src/encode.rs` + `src/commit.rs`):\n//!\n//! - `h2(a, b)`          = `Poseidon2::hash([a, b], 2)` -- term encoding layer\n//!   (`Enc_t(term) = h2(type_code, h_s(value))`).\n//! - `h3(s, p, o)`       = `Poseidon2::hash([s, p, o], 3)` -- triple leaf hash.\n//! - `commit_fold`       = `Poseidon2::hash(leaves, count)` -- the flat\n//!   per-graph commitment (plan S2.2 shape 1). The library's length-bearing\n//!   IV (`count * 2^64`) gives domain separation per leaf count, and a\n//!   runtime `count < N` leaves padding slots outside the absorbed message.\n//!\n//! Cost note (noir-optimisation S5): all of these lower to the\n//! `poseidon2_permutation` blackbox -- h2/h3 are one permutation each\n//! (~74 gates), `commit_fold::<N>` pays ceil(N/3)+1 permutations regardless\n//! of the runtime `count` (ACIR loops unroll over the comptime bound).\n\nuse poseidon::poseidon2::Poseidon2;\n\n/// Term-encoding layer hash (`Enc_t = h2(type_code, h_s)`).\npub fn h2(a: Field, b: Field) -> Field {\n    Poseidon2::hash([a, b], 2)\n}\n\n/// Triple leaf hash (`leaf = h3(Enc(s), Enc(p), Enc(o))`).\npub fn h3(s: Field, p: Field, o: Field) -> Field {\n    Poseidon2::hash([s, p, o], 3)\n}\n\n/// Flat per-graph commitment fold over the first `count` leaves.\npub fn commit_fold<let N: u32>(leaves: [Field; N], count: u32) -> Field {\n    Poseidon2::hash(leaves, count)\n}\n\n/// Term type codes -- mirror `sparq_zk::encode::TYPE_CODE_*`.\npub global TYPE_CODE_IRI: Field = 1;\npub global TYPE_CODE_LITERAL: Field = 2;\npub global TYPE_CODE_BLANK_NODE: Field = 3;\n",
      path: "/private/tmp/claude-502/-Users-jesght-Documents-GitHub-jeswr-solid-mortgage/95574b57-dc0f-49f0-96e6-da23ea936933/scratchpad/zkbuild/compose_core/src/hashes.nr",
      function_locations: [
        {
          start: 1072,
          name: "h2",
        },
        {
          start: 1217,
          name: "h3",
        },
        {
          start: 1394,
          name: "commit_fold",
        },
      ],
    },
    "70": {
      source:
        "use std::default::Default;\nuse std::hash::Hasher;\n\nglobal RATE: u32 = 3;\n\npub struct Poseidon2 {\n    cache: [Field; 3],\n    state: [Field; 4],\n    cache_size: u32,\n    squeeze_mode: bool, // 0 => absorb, 1 => squeeze\n}\n\nimpl Poseidon2 {\n    #[no_predicates]\n    pub fn hash<let N: u32>(input: [Field; N], message_size: u32) -> Field {\n        Poseidon2::hash_internal(input, message_size)\n    }\n\n    pub(crate) fn new(iv: Field) -> Poseidon2 {\n        let mut result =\n            Poseidon2 { cache: [0; 3], state: [0; 4], cache_size: 0, squeeze_mode: false };\n        result.state[RATE] = iv;\n        result\n    }\n\n    fn perform_duplex(&mut self) {\n        // add the cache into sponge state\n        self.state[0] += self.cache[0];\n        self.state[1] += self.cache[1];\n        self.state[2] += self.cache[2];\n        self.state = crate::poseidon2_permutation(self.state);\n    }\n\n    fn absorb(&mut self, input: Field) {\n        assert(!self.squeeze_mode);\n        if self.cache_size == RATE {\n            // If we're absorbing, and the cache is full, apply the sponge permutation to compress the cache\n            self.perform_duplex();\n            self.cache[0] = input;\n            self.cache_size = 1;\n        } else {\n            // If we're absorbing, and the cache is not full, add the input into the cache\n            self.cache[self.cache_size] = input;\n            self.cache_size += 1;\n        }\n    }\n\n    fn squeeze(&mut self) -> Field {\n        assert(!self.squeeze_mode);\n        // If we're in absorb mode, apply sponge permutation to compress the cache.\n        self.perform_duplex();\n        self.squeeze_mode = true;\n\n        // Pop one item off the top of the permutation and return it.\n        self.state[0]\n    }\n\n    fn hash_internal<let N: u32>(input: [Field; N], in_len: u32) -> Field {\n        let two_pow_64 = 18446744073709551616;\n        let iv: Field = (in_len as Field) * two_pow_64;\n        let mut state = [0; 4];\n        state[RATE] = iv;\n\n        if std::runtime::is_unconstrained() {\n            for i in 0..(in_len / RATE) {\n                state[0] += input[i * RATE];\n                state[1] += input[i * RATE + 1];\n                state[2] += input[i * RATE + 2];\n                state = crate::poseidon2_permutation(state);\n            }\n\n            // handle remaining elements after last full RATE-sized chunk\n            let num_extra_fields = in_len % RATE;\n            if num_extra_fields != 0 {\n                let remainder_start = in_len - num_extra_fields;\n                state[0] += input[remainder_start];\n                if num_extra_fields > 1 {\n                    state[1] += input[remainder_start + 1];\n                }\n            }\n        } else {\n            let mut states: [[Field; 4]; N / RATE + 1] = [[0; 4]; N / RATE + 1];\n            states[0] = state;\n\n            // process all full RATE-sized chunks, storing state after each permutation\n            for chunk_idx in 0..(N / RATE) {\n                for i in 0..RATE {\n                    state[i] += input[chunk_idx * RATE + i];\n                }\n                state = crate::poseidon2_permutation(state);\n                states[chunk_idx + 1] = state;\n            }\n\n            // get state at the last full block before in_len\n            let first_partially_filled_chunk = in_len / RATE;\n            state = states[first_partially_filled_chunk];\n\n            // handle remaining elements after last full RATE-sized chunk\n            let remainder_start = (in_len / RATE) * RATE;\n            for j in 0..RATE {\n                let idx = remainder_start + j;\n                if idx < in_len {\n                    state[j] += input[idx];\n                }\n            }\n        }\n\n        // always run final permutation unless we just completed a full chunk\n        // still need to permute once if in_len is 0\n        if (in_len == 0) | (in_len % RATE != 0) {\n            state = crate::poseidon2_permutation(state);\n        };\n\n        state[0]\n    }\n}\n\npub struct Poseidon2Hasher {\n    _state: [Field],\n}\n\nimpl Hasher for Poseidon2Hasher {\n    fn finish(self) -> Field {\n        let iv: Field = (self._state.len() as Field) * 18446744073709551616; // iv = (self._state.len() << 64)\n        let mut sponge = Poseidon2::new(iv);\n        for i in 0..self._state.len() {\n            sponge.absorb(self._state[i]);\n        }\n        sponge.squeeze()\n    }\n\n    fn write(&mut self, input: Field) {\n        self._state = self._state.push_back(input);\n    }\n}\n\nimpl Default for Poseidon2Hasher {\n    fn default() -> Self {\n        Poseidon2Hasher { _state: @[] }\n    }\n}\n",
      path: "/Users/jesght/nargo/github.com/noir-lang/poseidon/v0.3.0/src/poseidon2.nr",
      function_locations: [
        {
          start: 333,
          name: "Poseidon2::hash",
        },
        {
          start: 442,
          name: "Poseidon2::new",
        },
        {
          start: 649,
          name: "Poseidon2::perform_duplex",
        },
        {
          start: 923,
          name: "Poseidon2::absorb",
        },
        {
          start: 1453,
          name: "Poseidon2::squeeze",
        },
        {
          start: 1814,
          name: "Poseidon2::hash_internal",
        },
        {
          start: 4105,
          name: "<impl Hasher for Poseidon2Hasher>::finish",
        },
        {
          start: 4426,
          name: "<impl Hasher for Poseidon2Hasher>::write",
        },
        {
          start: 4549,
          name: "<impl Default for Poseidon2Hasher>::default",
        },
      ],
    },
  },
} as const;
